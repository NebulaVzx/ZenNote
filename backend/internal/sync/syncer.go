package sync

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/db"
	"github.com/NebulaVzx/ZenNote/backend/internal/models"
)

// SyncFile represents a local file that participates in synchronization
type SyncFile struct {
	Name       string
	LocalPath  string
	ModifiedAt int64
	Size       int64
	MD5        string
}

// Syncer orchestrates cloud sync operations
type Syncer struct {
	workspaceID   string
	workspacePath string
}

// NewSyncer creates a Syncer for the given workspace
func NewSyncer(workspaceID, workspacePath string) *Syncer {
	return &Syncer{
		workspaceID:   workspaceID,
		workspacePath: workspacePath,
	}
}

// Upload pushes changed local files to S3
func (s *Syncer) Upload(ctx context.Context) error {
	cfg, client, err := s.loadConfigAndClient()
	if err != nil {
		return err
	}
	if cfg == nil {
		return fmt.Errorf("sync not configured")
	}

	files, err := s.scanLocalFiles()
	if err != nil {
		return err
	}

	metaMap, err := s.loadMetadata()
	if err != nil {
		return err
	}

	for _, f := range files {
		meta, ok := metaMap[f.Name]
		needsUpload := !ok || meta.LocalModifiedAt < f.ModifiedAt || meta.RemoteETag != f.MD5
		if !needsUpload {
			continue
		}

		file, err := os.Open(f.LocalPath)
		if err != nil {
			return err
		}
		err = client.Upload(ctx, f.Name, file, f.Size)
		file.Close()
		if err != nil {
			return fmt.Errorf("upload %s failed: %w", f.Name, err)
		}

		now := time.Now().UnixMilli()
		if err := s.upsertMetadata(f.Name, f.MD5, now, f.ModifiedAt, now); err != nil {
			return err
		}
	}

	now := time.Now().UnixMilli()
	_, err = db.DB.Exec("UPDATE sync_configs SET last_sync_at = ? WHERE id = ?", now, cfg.ID)
	return err
}

// Download pulls changed remote files from S3, resolving conflicts with LWW
func (s *Syncer) Download(ctx context.Context) error {
	cfg, client, err := s.loadConfigAndClient()
	if err != nil {
		return err
	}
	if cfg == nil {
		return fmt.Errorf("sync not configured")
	}

	remoteFiles, err := client.ListObjects(ctx, "")
	if err != nil {
		return fmt.Errorf("list remote files failed: %w", err)
	}

	metaMap, err := s.loadMetadata()
	if err != nil {
		return err
	}

	localFilesMap := make(map[string]SyncFile)
	localFiles, err := s.scanLocalFiles()
	if err != nil {
		return err
	}
	for _, f := range localFiles {
		localFilesMap[f.Name] = f
	}

	needsReinit := false
	for key, remote := range remoteFiles {
		name := s.stripPrefix(key)
		if name == "" {
			continue
		}

		meta, hasMeta := metaMap[name]
		local, hasLocal := localFilesMap[name]

		remoteModifiedAt := remote.LastModified.UnixMilli()
		remoteETag := remote.ETag

		needsDownload := !hasMeta
		if !needsDownload && meta.RemoteModifiedAt < remoteModifiedAt {
			needsDownload = true
		}

		if !needsDownload {
			continue
		}

		// Conflict detection: both local and remote changed since last sync
		conflict := false
		if hasLocal && hasMeta && local.ModifiedAt > meta.LocalModifiedAt {
			conflict = true
		}

		if conflict {
			// LWW: compare local mtime with remote mtime
			if local.ModifiedAt > remoteModifiedAt {
				// Local wins, skip download
				continue
			}
			// Remote wins, backup local first
			backupPath := filepath.Join(s.workspacePath, ".zennote", name+".conflict-"+fmt.Sprintf("%d", time.Now().UnixMilli()))
			_ = os.Rename(local.LocalPath, backupPath)
		}

		tmpPath := filepath.Join(s.workspacePath, ".zennote", name+".tmp")
		rc, _, err := client.Download(ctx, name)
		if err != nil {
			return fmt.Errorf("download %s failed: %w", name, err)
		}
		f, err := os.Create(tmpPath)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(f, rc)
		f.Close()
		rc.Close()
		if err != nil {
			return err
		}

		needsReinit = true
		targetPath := filepath.Join(s.workspacePath, ".zennote", name)
		if err := s.replaceFile(targetPath, tmpPath); err != nil {
			return err
		}

		now := time.Now().UnixMilli()
		localInfo, _ := os.Stat(targetPath)
		localMtime := now
		if localInfo != nil {
			localMtime = localInfo.ModTime().UnixMilli()
		}
		if err := s.upsertMetadata(name, remoteETag, remoteModifiedAt, localMtime, now); err != nil {
			return err
		}
	}

	if needsReinit {
		_ = db.DB.Close()
		if err := db.Init(s.workspacePath); err != nil {
			return fmt.Errorf("failed to reinitialize database after download: %w", err)
		}
	}

	now := time.Now().UnixMilli()
	_, err = db.DB.Exec("UPDATE sync_configs SET last_sync_at = ? WHERE id = ?", now, cfg.ID)
	return err
}

func (s *Syncer) loadConfigAndClient() (*models.SyncConfig, *S3Client, error) {
	var cfg models.SyncConfig
	err := db.DB.QueryRow(`
		SELECT id, workspace_id, provider, endpoint, region, bucket, prefix,
			access_key_id, secret_access_key, auto_sync, sync_interval, last_sync_at, created_at, updated_at
		FROM sync_configs WHERE workspace_id = ?`, s.workspaceID).
		Scan(&cfg.ID, &cfg.WorkspaceID, &cfg.Provider, &cfg.Endpoint, &cfg.Region, &cfg.Bucket, &cfg.Prefix,
			&cfg.AccessKeyID, &cfg.SecretAccessKey, &cfg.AutoSync, &cfg.SyncInterval, &cfg.LastSyncAt, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}

	client, err := NewS3Client(&cfg)
	if err != nil {
		return nil, nil, err
	}
	return &cfg, client, nil
}

func (s *Syncer) scanLocalFiles() ([]SyncFile, error) {
	dir := filepath.Join(s.workspacePath, ".zennote")
	names := []string{"data.db", "data.db-wal", "data.db-shm"}
	var files []SyncFile
	for _, name := range names {
		path := filepath.Join(dir, name)
		info, err := os.Stat(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return nil, err
		}
		md5hash, err := fileMD5(path)
		if err != nil {
			return nil, err
		}
		files = append(files, SyncFile{
			Name:       name,
			LocalPath:  path,
			ModifiedAt: info.ModTime().UnixMilli(),
			Size:       info.Size(),
			MD5:        md5hash,
		})
	}
	return files, nil
}

func (s *Syncer) loadMetadata() (map[string]models.SyncMetadata, error) {
	rows, err := db.DB.Query("SELECT id, workspace_id, file_name, remote_etag, remote_modified_at, local_modified_at, last_sync_at, created_at, updated_at FROM sync_metadata WHERE workspace_id = ?", s.workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]models.SyncMetadata)
	for rows.Next() {
		var m models.SyncMetadata
		err := rows.Scan(&m.ID, &m.WorkspaceID, &m.FileName, &m.RemoteETag, &m.RemoteModifiedAt, &m.LocalModifiedAt, &m.LastSyncAt, &m.CreatedAt, &m.UpdatedAt)
		if err != nil {
			continue
		}
		result[m.FileName] = m
	}
	return result, nil
}

func (s *Syncer) upsertMetadata(fileName, etag string, remoteModifiedAt, localModifiedAt, lastSyncAt int64) error {
	var existingID string
	err := db.DB.QueryRow("SELECT id FROM sync_metadata WHERE workspace_id = ? AND file_name = ?", s.workspaceID, fileName).Scan(&existingID)
	now := time.Now().UnixMilli()
	if err == sql.ErrNoRows {
		id := fmt.Sprintf("meta-%d", now)
		_, err = db.DB.Exec(`
			INSERT INTO sync_metadata (id, workspace_id, file_name, remote_etag, remote_modified_at, local_modified_at, last_sync_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, s.workspaceID, fileName, etag, remoteModifiedAt, localModifiedAt, lastSyncAt, now, now)
		return err
	}
	if err != nil {
		return err
	}
	_, err = db.DB.Exec(`
		UPDATE sync_metadata SET remote_etag = ?, remote_modified_at = ?, local_modified_at = ?, last_sync_at = ?, updated_at = ?
		WHERE id = ?`,
		etag, remoteModifiedAt, localModifiedAt, lastSyncAt, now, existingID)
	return err
}

func (s *Syncer) stripPrefix(key string) string {
	cfg, _, err := s.loadConfigAndClient()
	if err != nil || cfg == nil {
		return key
	}
	if cfg.Prefix == "" {
		return key
	}
	prefix := cfg.Prefix + "/"
	if strings.HasPrefix(key, prefix) {
		return strings.TrimPrefix(key, prefix)
	}
	return key
}

func (s *Syncer) replaceFile(targetPath, tmpPath string) error {
	backup := targetPath + ".bak"
	_ = os.Remove(backup)
	if _, err := os.Stat(targetPath); err == nil {
		if err := os.Rename(targetPath, backup); err != nil {
			return fmt.Errorf("backup existing file failed: %w", err)
		}
	}
	if err := os.Rename(tmpPath, targetPath); err != nil {
		_ = os.Rename(backup, targetPath) // restore
		return fmt.Errorf("replace file failed: %w", err)
	}
	_ = os.Remove(backup)
	return nil
}

func fileMD5(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

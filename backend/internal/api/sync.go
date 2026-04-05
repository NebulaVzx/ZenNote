package api

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/db"
	"github.com/NebulaVzx/ZenNote/backend/internal/models"
	"github.com/NebulaVzx/ZenNote/backend/internal/sync"
	"github.com/gin-gonic/gin"
)

func registerSyncRoutes(r *gin.Engine) {
	r.GET("/api/sync/config", getSyncConfig)
	r.PUT("/api/sync/config", updateSyncConfig)
	r.POST("/api/sync/config/test", testSyncConnection)
	r.POST("/api/sync/upload", triggerUpload)
	r.POST("/api/sync/download", triggerDownload)
}

func getSyncConfig(c *gin.Context) {
	var cfg models.SyncConfig
	err := db.DB.QueryRow(`
		SELECT id, workspace_id, provider, endpoint, region, bucket, prefix,
			access_key_id, secret_access_key, auto_sync, sync_interval, last_sync_at, created_at, updated_at
		FROM sync_configs WHERE workspace_id = 'default'`).
		Scan(&cfg.ID, &cfg.WorkspaceID, &cfg.Provider, &cfg.Endpoint, &cfg.Region, &cfg.Bucket, &cfg.Prefix,
			&cfg.AccessKeyID, &cfg.SecretAccessKey, &cfg.AutoSync, &cfg.SyncInterval, &cfg.LastSyncAt, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"config": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

func updateSyncConfig(c *gin.Context) {
	var req struct {
		Provider        string `json:"provider"`
		Endpoint        string `json:"endpoint"`
		Region          string `json:"region"`
		Bucket          string `json:"bucket"`
		Prefix          string `json:"prefix"`
		AccessKeyID     string `json:"access_key_id"`
		SecretAccessKey string `json:"secret_access_key"`
		AutoSync        int    `json:"auto_sync"`
		SyncInterval    int    `json:"sync_interval"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UnixMilli()
	var existingID string
	err := db.DB.QueryRow("SELECT id FROM sync_configs WHERE workspace_id = 'default'").Scan(&existingID)
	if err == sql.ErrNoRows {
		id := generateID("sync")
		_, err = db.DB.Exec(`
			INSERT INTO sync_configs
			(id, workspace_id, provider, endpoint, region, bucket, prefix, access_key_id, secret_access_key, auto_sync, sync_interval, last_sync_at, created_at, updated_at)
			VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
			id, req.Provider, req.Endpoint, req.Region, req.Bucket, req.Prefix, req.AccessKeyID, req.SecretAccessKey, req.AutoSync, req.SyncInterval, now, now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": id})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE sync_configs SET
		provider = ?, endpoint = ?, region = ?, bucket = ?, prefix = ?,
		access_key_id = ?, secret_access_key = ?, auto_sync = ?, sync_interval = ?, updated_at = ?
		WHERE id = ?`,
		req.Provider, req.Endpoint, req.Region, req.Bucket, req.Prefix,
		req.AccessKeyID, req.SecretAccessKey, req.AutoSync, req.SyncInterval, now, existingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func testSyncConnection(c *gin.Context) {
	var req struct {
		Provider        string `json:"provider"`
		Endpoint        string `json:"endpoint"`
		Region          string `json:"region"`
		Bucket          string `json:"bucket"`
		Prefix          string `json:"prefix"`
		AccessKeyID     string `json:"access_key_id"`
		SecretAccessKey string `json:"secret_access_key"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg := &models.SyncConfig{
		Provider:        req.Provider,
		Endpoint:        req.Endpoint,
		Region:          req.Region,
		Bucket:          req.Bucket,
		Prefix:          req.Prefix,
		AccessKeyID:     req.AccessKeyID,
		SecretAccessKey: req.SecretAccessKey,
	}

	client, err := sync.NewS3Client(cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := client.TestConnection(c.Request.Context()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func triggerUpload(c *gin.Context) {
	syncer := sync.NewSyncer("default", WorkspacePath)
	if err := syncer.Upload(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func triggerDownload(c *gin.Context) {
	syncer := sync.NewSyncer("default", WorkspacePath)
	if err := syncer.Download(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

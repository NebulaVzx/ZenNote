package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// Init initializes the SQLite database at the given workspace path
func Init(workspacePath string) error {
	dataDir := filepath.Join(workspacePath, ".zennote")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return err
	}
	dbPath := filepath.Join(dataDir, "data.db")

	var err error
	DB, err = sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return err
	}

	if err := createTables(); err != nil {
		return err
	}
	if err := createTriggers(); err != nil {
		return err
	}
	return seedDefaultWorkspace(workspacePath)
}

func createTables() error {
	// Migrate: add columns to pages if missing
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN deleted_at INTEGER DEFAULT 0")
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN is_favorite INTEGER DEFAULT 0")
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN file_path TEXT")
	_, _ = DB.Exec("ALTER TABLE pages ADD COLUMN frontmatter TEXT")

	schema := `
CREATE TABLE IF NOT EXISTS workspaces (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	local_path TEXT NOT NULL,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS pages (
	id TEXT PRIMARY KEY,
	workspace_id TEXT NOT NULL,
	parent_id TEXT,
	title TEXT,
	icon TEXT DEFAULT '',
	sort_order INTEGER DEFAULT 0,
	is_favorite INTEGER DEFAULT 0,
	file_path TEXT,
	frontmatter TEXT,
	created_at INTEGER,
	updated_at INTEGER,
	FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
	FOREIGN KEY (parent_id) REFERENCES pages(id)
);

CREATE TABLE IF NOT EXISTS blocks (
	id TEXT PRIMARY KEY,
	page_id TEXT NOT NULL,
	type TEXT NOT NULL,
	content TEXT,
	props TEXT,
	parent_id TEXT,
	sort_order INTEGER DEFAULT 0,
	created_at INTEGER,
	updated_at INTEGER,
	FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
	FOREIGN KEY (parent_id) REFERENCES blocks(id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
	content,
	content='blocks',
	content_rowid='rowid'
);

	CREATE TABLE IF NOT EXISTS sync_configs (
		id TEXT PRIMARY KEY,
		workspace_id TEXT NOT NULL,
		provider TEXT NOT NULL DEFAULT 's3',
		endpoint TEXT,
		region TEXT,
		bucket TEXT NOT NULL,
		prefix TEXT DEFAULT '',
		access_key_id TEXT NOT NULL,
		secret_access_key TEXT NOT NULL,
		auto_sync INTEGER DEFAULT 1,
		sync_interval INTEGER DEFAULT 300,
		last_sync_at INTEGER,
		created_at INTEGER,
		updated_at INTEGER,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	);

	CREATE TABLE IF NOT EXISTS sync_metadata (
		id TEXT PRIMARY KEY,
		workspace_id TEXT NOT NULL,
		file_name TEXT NOT NULL,
		remote_etag TEXT,
		remote_modified_at INTEGER,
		local_modified_at INTEGER,
		last_sync_at INTEGER,
		created_at INTEGER,
		updated_at INTEGER,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	);

	CREATE TABLE IF NOT EXISTS ai_configs (
		id TEXT PRIMARY KEY,
		workspace_id TEXT NOT NULL,
		name TEXT NOT NULL,
		provider TEXT NOT NULL DEFAULT 'openai',
		api_key TEXT NOT NULL,
		base_url TEXT,
		model TEXT NOT NULL,
		temperature REAL DEFAULT 0.7,
		max_tokens INTEGER DEFAULT 2048,
		is_default INTEGER DEFAULT 0,
		created_at INTEGER,
		updated_at INTEGER,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	);
`
	_, err := DB.Exec(schema)
	return err
}

func createTriggers() error {
	triggers := `
CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks BEGIN
	INSERT INTO blocks_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS blocks_ad AFTER DELETE ON blocks BEGIN
	INSERT INTO blocks_fts(blocks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS blocks_au AFTER UPDATE ON blocks BEGIN
	INSERT INTO blocks_fts(blocks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
	INSERT INTO blocks_fts(rowid, content) VALUES (new.rowid, new.content);
END;
`
	_, err := DB.Exec(triggers)
	return err
}

func seedDefaultWorkspace(workspacePath string) error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM workspaces").Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	now := time.Now().UnixMilli()
	wsID := "default"
	_, err = DB.Exec("INSERT INTO workspaces (id, name, local_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		wsID, "My Workspace", workspacePath, now, now)
	if err != nil {
		return err
	}

	pageID := "page-" + fmt.Sprintf("%d", now)
	_, err = DB.Exec("INSERT INTO pages (id, workspace_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		pageID, wsID, "Welcome to ZenNote", 0, now, now)
	if err != nil {
		return err
	}

	blockID := "block-" + fmt.Sprintf("%d", now)
	_, err = DB.Exec("INSERT INTO blocks (id, page_id, type, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		blockID, pageID, "paragraph", "Start writing your notes here...", 0, now, now)
	return err
}

package models

// Page represents a notebook page
type Page struct {
	ID         string  `json:"id"`
	ParentID   *string `json:"parent_id"`
	Title      string  `json:"title"`
	Icon       *string `json:"icon"`
	SortOrder  int     `json:"sort_order"`
	IsFavorite int     `json:"is_favorite"`
	CreatedAt  int64   `json:"created_at"`
	UpdatedAt  int64   `json:"updated_at"`
	DeletedAt  *int64  `json:"deleted_at,omitempty"`
}

// Block represents a content block within a page
type Block struct {
	ID        string `json:"id"`
	PageID    string `json:"page_id"`
	Type      string `json:"type"`
	Content   string `json:"content"`
	Props     string `json:"props"`
	ParentID  string `json:"parent_id"`
	SortOrder int    `json:"sort_order"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// Workspace represents a user workspace
type Workspace struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	LocalPath string `json:"local_path"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// SearchResult represents a search hit
type SearchResult struct {
	PageID     string `json:"page_id"`
	PageTitle  string `json:"page_title"`
	BlockID    string `json:"block_id"`
	Content    string `json:"content"`
	Highlights string `json:"highlights"`
}

// SyncConfig represents cloud sync configuration for a workspace
type SyncConfig struct {
	ID              string `json:"id"`
	WorkspaceID     string `json:"workspace_id"`
	Provider        string `json:"provider"`
	Endpoint        string `json:"endpoint"`
	Region          string `json:"region"`
	Bucket          string `json:"bucket"`
	Prefix          string `json:"prefix"`
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
	AutoSync        int    `json:"auto_sync"`
	SyncInterval    int    `json:"sync_interval"`
	LastSyncAt      int64  `json:"last_sync_at"`
	CreatedAt       int64  `json:"created_at"`
	UpdatedAt       int64  `json:"updated_at"`
}

// SyncMetadata tracks the sync state of individual files
type SyncMetadata struct {
	ID               string `json:"id"`
	WorkspaceID      string `json:"workspace_id"`
	FileName         string `json:"file_name"`
	RemoteETag       string `json:"remote_etag"`
	RemoteModifiedAt int64  `json:"remote_modified_at"`
	LocalModifiedAt  int64  `json:"local_modified_at"`
	LastSyncAt       int64  `json:"last_sync_at"`
	CreatedAt        int64  `json:"created_at"`
	UpdatedAt        int64  `json:"updated_at"`
}

// AIConfig represents an AI provider configuration
type AIConfig struct {
	ID          string  `json:"id"`
	WorkspaceID string  `json:"workspace_id"`
	Name        string  `json:"name"`
	Provider    string  `json:"provider"`
	APIKey      string  `json:"api_key"`
	BaseURL     string  `json:"base_url"`
	Model       string  `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	IsDefault   int     `json:"is_default"`
	CreatedAt   int64   `json:"created_at"`
	UpdatedAt   int64   `json:"updated_at"`
}

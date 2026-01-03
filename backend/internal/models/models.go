package models

// Page represents a notebook page
type Page struct {
	ID        string  `json:"id"`
	ParentID  *string `json:"parent_id"`
	Title     string  `json:"title"`
	Icon      string  `json:"icon"`
	SortOrder int     `json:"sort_order"`
	CreatedAt int64   `json:"created_at"`
	UpdatedAt int64   `json:"updated_at"`
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

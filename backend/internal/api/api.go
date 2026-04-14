package api

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/db"
	"github.com/NebulaVzx/ZenNote/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// WorkspacePath holds the active workspace directory path
var WorkspacePath string

func RegisterRoutes(r *gin.Engine) {
	r.GET("/api/pages", listPages)
	r.POST("/api/pages", createPage)
	r.GET("/api/pages/:id", getPage)
	r.PUT("/api/pages/:id", updatePage)
	r.DELETE("/api/pages/:id", deletePage)
	r.GET("/api/pages/:id/blocks", getBlocks)
	r.PUT("/api/pages/:id/blocks", updateBlocks)
	r.GET("/api/search", search)
	r.GET("/api/health", healthCheck)
	registerSyncRoutes(r)
}

func listPages(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, parent_id, title, icon, sort_order, created_at, updated_at
		FROM pages ORDER BY sort_order ASC, created_at ASC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	pages := make([]models.Page, 0)
	for rows.Next() {
		var p models.Page
		var parentID sql.NullString
		var icon sql.NullString
		err := rows.Scan(&p.ID, &parentID, &p.Title, &icon, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			continue
		}
		if parentID.Valid {
			p.ParentID = &parentID.String
		}
		if icon.Valid {
			p.Icon = &icon.String
		}
		pages = append(pages, p)
	}
	c.JSON(http.StatusOK, pages)
}

func createPage(c *gin.Context) {
	var req struct {
		Title    string  `json:"title"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := generateID("page")
	now := time.Now().UnixMilli()
	_, err := db.DB.Exec(
		"INSERT INTO pages (id, workspace_id, parent_id, title, icon, sort_order, created_at, updated_at) VALUES (?, 'default', ?, ?, '', 0, ?, ?)",
		id, req.ParentID, req.Title, now, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bid := generateID("block")
	db.DB.Exec("INSERT INTO blocks (id, page_id, type, content, sort_order, created_at, updated_at) VALUES (?, ?, 'paragraph', '', 0, ?, ?)", bid, id, now, now)

	c.JSON(http.StatusOK, gin.H{"id": id})
}

func getPage(c *gin.Context) {
	id := c.Param("id")
	var p models.Page
	var parentID sql.NullString
	var icon sql.NullString
	err := db.DB.QueryRow("SELECT id, parent_id, title, icon, sort_order, created_at, updated_at FROM pages WHERE id = ?", id).
		Scan(&p.ID, &parentID, &p.Title, &icon, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if parentID.Valid {
		p.ParentID = &parentID.String
	}
	if icon.Valid {
		p.Icon = &icon.String
	}
	c.JSON(http.StatusOK, p)
}

func updatePage(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Title string `json:"title"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	now := time.Now().UnixMilli()
	_, err := db.DB.Exec("UPDATE pages SET title = ?, updated_at = ? WHERE id = ?", req.Title, now, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func deletePage(c *gin.Context) {
	id := c.Param("id")
	_, err := db.DB.Exec("DELETE FROM pages WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func getBlocks(c *gin.Context) {
	pageID := c.Param("id")
	rows, err := db.DB.Query(`
		SELECT id, page_id, type, content, props, parent_id, sort_order, created_at, updated_at
		FROM blocks WHERE page_id = ? ORDER BY sort_order ASC, created_at ASC`, pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	blocks := make([]models.Block, 0)
	for rows.Next() {
		var b models.Block
		var parentID sql.NullString
		var props sql.NullString
		err := rows.Scan(&b.ID, &b.PageID, &b.Type, &b.Content, &props, &parentID, &b.SortOrder, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			continue
		}
		if parentID.Valid {
			b.ParentID = parentID.String
		}
		if props.Valid {
			b.Props = props.String
		}
		blocks = append(blocks, b)
	}
	c.JSON(http.StatusOK, blocks)
}

func updateBlocks(c *gin.Context) {
	pageID := c.Param("id")
	var blocks []models.Block
	if err := c.BindJSON(&blocks); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM blocks WHERE page_id = ?", pageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UnixMilli()
	stmt, err := tx.Prepare(`
		INSERT INTO blocks (id, page_id, type, content, props, parent_id, sort_order, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer stmt.Close()

	for i, b := range blocks {
		if b.ID == "" {
			b.ID = generateID("block")
		}
		if b.CreatedAt == 0 {
			b.CreatedAt = now
		}
		b.UpdatedAt = now
		props := b.Props
		if props == "" {
			props = "{}"
		}
		_, err := stmt.Exec(b.ID, pageID, b.Type, b.Content, props, b.ParentID, i, b.CreatedAt, b.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func search(c *gin.Context) {
	q := c.Query("q")
	if strings.TrimSpace(q) == "" {
		c.JSON(http.StatusOK, []models.SearchResult{})
		return
	}

	query := `
		SELECT p.id, p.title, b.id, b.content, snippet(blocks_fts, 0, '<mark>', '</mark>', '...', 32)
		FROM blocks_fts
		JOIN blocks b ON b.rowid = blocks_fts.rowid
		JOIN pages p ON p.id = b.page_id
		WHERE blocks_fts MATCH ?
		LIMIT 50
	`
	rows, err := db.DB.Query(query, q+"*")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	results := make([]models.SearchResult, 0)
	for rows.Next() {
		var r models.SearchResult
		var highlights string
		err := rows.Scan(&r.PageID, &r.PageTitle, &r.BlockID, &r.Content, &highlights)
		if err != nil {
			continue
		}
		r.Highlights = highlights
		results = append(results, r)
	}
	c.JSON(http.StatusOK, results)
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "version": "0.2.0"})
}

func generateID(prefix string) string {
	return prefix + "-" + strings.ReplaceAll(time.Now().Format("20060102150405.000"), ".", "") + "-" + strings.ReplaceAll(time.Now().Format("000000000"), ".", "")
}

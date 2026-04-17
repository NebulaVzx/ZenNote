package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/api"
	"github.com/NebulaVzx/ZenNote/backend/internal/db"
	syncer "github.com/NebulaVzx/ZenNote/backend/internal/sync"
	"github.com/gin-gonic/gin"
)

func main() {
	var workspace string
	flag.StringVar(&workspace, "workspace", "", "Workspace directory path")
	flag.Parse()

	if workspace == "" {
		// Default to executable directory/ZenNoteWorkspace
		ex, err := os.Executable()
		if err != nil {
			panic(err)
		}
		workspace = filepath.Join(filepath.Dir(ex), "ZenNoteWorkspace")
	}

	if err := os.MkdirAll(workspace, 0755); err != nil {
		panic(err)
	}

	if err := db.Init(workspace); err != nil {
		panic(err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS for local dev
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api.WorkspacePath = workspace
	api.RegisterRoutes(r)

	go startAutoSync(workspace)

	fmt.Println("ZenNote backend listening on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		panic(err)
	}
}

func startAutoSync(workspace string) {
	var mu sync.Mutex
	for {
		time.Sleep(30 * time.Second)
		var autoSync, interval int
		var lastSync int64
		err := db.DB.QueryRow("SELECT auto_sync, sync_interval, last_sync_at FROM sync_configs WHERE workspace_id = 'default'").Scan(&autoSync, &interval, &lastSync)
		if err != nil {
			continue
		}
		if autoSync != 1 {
			continue
		}
		if interval < 60 {
			interval = 300
		}
		now := time.Now().Unix()
		if now-lastSync < int64(interval) {
			continue
		}
		mu.Lock()
		s := syncer.NewSyncer("default", workspace)
		if err := s.Upload(context.Background()); err != nil {
			fmt.Printf("[auto-sync] upload failed: %v\n", err)
		} else {
			fmt.Println("[auto-sync] upload complete")
		}
		mu.Unlock()
	}
}

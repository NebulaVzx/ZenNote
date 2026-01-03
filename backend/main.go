package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/NebulaVzx/ZenNote/backend/internal/api"
	"github.com/NebulaVzx/ZenNote/backend/internal/db"
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

	api.RegisterRoutes(r)

	fmt.Println("ZenNote backend listening on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		panic(err)
	}
}

package api

import (
	"bufio"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/NebulaVzx/ZenNote/backend/internal/db"
	"github.com/NebulaVzx/ZenNote/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func registerAIRoutes(r *gin.Engine) {
	r.GET("/api/ai_configs", listAIConfigs)
	r.POST("/api/ai_configs", createAIConfig)
	r.PUT("/api/ai_configs/:id", updateAIConfig)
	r.DELETE("/api/ai_configs/:id", deleteAIConfig)
	r.POST("/api/ai_configs/:id/test", testAIConfig)
	r.POST("/api/ai/generate", generateAIContent)
	r.POST("/api/ai/generate-stream", generateAIContentStream)
}

func listAIConfigs(c *gin.Context) {
	rows, err := db.DB.Query(`
		SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
		FROM ai_configs ORDER BY created_at ASC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	configs := make([]models.AIConfig, 0)
	for rows.Next() {
		var cfg models.AIConfig
		err := rows.Scan(
			&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
			&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
		)
		if err != nil {
			continue
		}
		configs = append(configs, cfg)
	}
	c.JSON(http.StatusOK, configs)
}

func createAIConfig(c *gin.Context) {
	var req models.AIConfig
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	id := generateID("ai_config")
	now := time.Now().UnixMilli()
	if req.WorkspaceID == "" {
		req.WorkspaceID = "default"
	}
	if req.Provider == "" {
		req.Provider = "openai"
	}

	_, err := db.DB.Exec(
		`INSERT INTO ai_configs (id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, req.WorkspaceID, req.Name, req.Provider, req.APIKey, req.BaseURL, req.Model,
		req.Temperature, req.MaxTokens, req.IsDefault, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.IsDefault == 1 {
		_, _ = db.DB.Exec("UPDATE ai_configs SET is_default = 0 WHERE workspace_id = ? AND id != ?", req.WorkspaceID, id)
	}

	c.JSON(http.StatusOK, gin.H{"id": id})
}

func updateAIConfig(c *gin.Context) {
	id := c.Param("id")
	var req models.AIConfig
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	now := time.Now().UnixMilli()
	workspaceID := req.WorkspaceID
	if workspaceID == "" {
		workspaceID = "default"
	}

	_, err := db.DB.Exec(
		`UPDATE ai_configs SET name = ?, provider = ?, api_key = ?, base_url = ?, model = ?, temperature = ?, max_tokens = ?, is_default = ?, updated_at = ?
		WHERE id = ?`,
		req.Name, req.Provider, req.APIKey, req.BaseURL, req.Model,
		req.Temperature, req.MaxTokens, req.IsDefault, now, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.IsDefault == 1 {
		_, _ = db.DB.Exec("UPDATE ai_configs SET is_default = 0 WHERE workspace_id = ? AND id != ?", workspaceID, id)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func deleteAIConfig(c *gin.Context) {
	id := c.Param("id")
	_, err := db.DB.Exec("DELETE FROM ai_configs WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func getDefaultAIConfig() (*models.AIConfig, error) {
	var cfg models.AIConfig
	row := db.DB.QueryRow(`
		SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
		FROM ai_configs WHERE is_default = 1 LIMIT 1`)
	err := row.Scan(
		&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
		&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		row = db.DB.QueryRow(`
			SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
			FROM ai_configs ORDER BY created_at ASC LIMIT 1`)
		err = row.Scan(
			&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
			&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
		)
	}
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

func testAIConfig(c *gin.Context) {
	id := c.Param("id")
	var cfg models.AIConfig
	err := db.DB.QueryRow(`
		SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
		FROM ai_configs WHERE id = ?`, id).Scan(
		&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
		&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = callOpenAICompatible(&cfg, "Say hello in one sentence.")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "Connection successful"})
}

type generateRequest struct {
	Prompt    string `json:"prompt"`
	Action    string `json:"action"`
	Language  string `json:"language,omitempty"`
	ConfigID  string `json:"config_id,omitempty"`
}

func generateAIContent(c *gin.Context) {
	var req generateRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cfg *models.AIConfig
	var err error
	if req.ConfigID != "" {
		cfg = &models.AIConfig{}
		err = db.DB.QueryRow(`
			SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
			FROM ai_configs WHERE id = ?`, req.ConfigID).Scan(
			&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
			&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
		)
	} else {
		cfg, err = getDefaultAIConfig()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No AI config found: " + err.Error()})
		return
	}

	systemPrompt := buildSystemPrompt(req.Action, req.Language)
	fullPrompt := systemPrompt + "\n\n" + req.Prompt

	content, err := callOpenAICompatible(cfg, fullPrompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"content": content})
}

func buildSystemPrompt(action, language string) string {
	switch action {
	case "continue":
		return "You are a helpful writing assistant. Continue the following text naturally in the same language and style. Only output the continuation, no explanations."
	case "polish":
		return "You are a helpful writing assistant. Polish and improve the following text while keeping its original meaning and language. Only output the improved text, no explanations."
	case "translate":
		lang := language
		if lang == "" {
			lang = "English"
		}
		return fmt.Sprintf("You are a helpful writing assistant. Translate the following text into %s. Only output the translated text, no explanations.", lang)
	case "explain":
		return "You are a helpful writing assistant. Explain the following concept or text clearly and concisely. Only output the explanation, no meta commentary."
	case "summary":
		return "You are a helpful writing assistant. Summarize the following text concisely, capturing the key points. Only output the summary, no explanations."
	case "shorter":
		return "You are a helpful writing assistant. Make the following text shorter while keeping all key points. Only output the shortened text, no explanations."
	case "longer":
		return "You are a helpful writing assistant. Expand the following text with more details and depth. Only output the expanded text, no explanations."
	case "professional":
		return "You are a helpful writing assistant. Rewrite the following text in a professional and formal tone. Only output the rewritten text, no explanations."
	case "casual":
		return "You are a helpful writing assistant. Rewrite the following text in a casual and relaxed tone. Only output the rewritten text, no explanations."
	case "friendly":
		return "You are a helpful writing assistant. Rewrite the following text in a warm and friendly tone. Only output the rewritten text, no explanations."
	case "code":
		lang := language
		if lang == "" {
			lang = "the appropriate language"
		}
		return fmt.Sprintf("You are a helpful coding assistant. Generate %s code based on the following request. Only output the code, no explanations. Include comments if helpful.", lang)
	default:
		return "You are a helpful writing assistant. Respond to the user's request concisely."
	}
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatRequest struct {
	Model       string              `json:"model"`
	Messages    []openAIChatMessage `json:"messages"`
	Temperature float64             `json:"temperature"`
	MaxTokens   int                 `json:"max_tokens"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func callOpenAICompatible(cfg *models.AIConfig, prompt string) (string, error) {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		if cfg.Provider == "ollama" {
			baseURL = "http://localhost:11434"
		} else {
			baseURL = "https://api.openai.com"
		}
	}

	chatReq := openAIChatRequest{
		Model: cfg.Model,
		Messages: []openAIChatMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: cfg.Temperature,
		MaxTokens:   cfg.MaxTokens,
	}
	if chatReq.Temperature == 0 {
		chatReq.Temperature = 0.7
	}
	if chatReq.MaxTokens == 0 {
		chatReq.MaxTokens = 2048
	}

	body, err := json.Marshal(chatReq)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", baseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var chatResp openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", err
	}
	if chatResp.Error != nil {
		return "", fmt.Errorf(chatResp.Error.Message)
	}
	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("empty response from AI")
	}
	return chatResp.Choices[0].Message.Content, nil
}

type openAIStreamChunk struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Choices []struct {
		Index        int `json:"index"`
		Delta        struct {
			Role    string `json:"role,omitempty"`
			Content string `json:"content,omitempty"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
}

func generateAIContentStream(c *gin.Context) {
	var req generateRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cfg *models.AIConfig
	var err error
	if req.ConfigID != "" {
		cfg = &models.AIConfig{}
		err = db.DB.QueryRow(`
			SELECT id, workspace_id, name, provider, api_key, base_url, model, temperature, max_tokens, is_default, created_at, updated_at
			FROM ai_configs WHERE id = ?`, req.ConfigID).Scan(
			&cfg.ID, &cfg.WorkspaceID, &cfg.Name, &cfg.Provider, &cfg.APIKey, &cfg.BaseURL, &cfg.Model,
			&cfg.Temperature, &cfg.MaxTokens, &cfg.IsDefault, &cfg.CreatedAt, &cfg.UpdatedAt,
		)
	} else {
		cfg, err = getDefaultAIConfig()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No AI config found: " + err.Error()})
		return
	}

	systemPrompt := buildSystemPrompt(req.Action, req.Language)
	fullPrompt := systemPrompt + "\n\n" + req.Prompt

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	if err := callOpenAICompatibleStream(cfg, fullPrompt, c.Writer); err != nil {
		c.Writer.Write([]byte("data: " + err.Error() + "\n\n"))
	}
}

func callOpenAICompatibleStream(cfg *models.AIConfig, prompt string, w http.ResponseWriter) error {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		if cfg.Provider == "ollama" {
			baseURL = "http://localhost:11434"
		} else {
			baseURL = "https://api.openai.com"
		}
	}

	chatReq := openAIChatRequest{
		Model: cfg.Model,
		Messages: []openAIChatMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: cfg.Temperature,
		MaxTokens:   cfg.MaxTokens,
	}
	if chatReq.Temperature == 0 {
		chatReq.Temperature = 0.7
	}
	if chatReq.MaxTokens == 0 {
		chatReq.MaxTokens = 2048
	}

	body, err := json.Marshal(struct {
		openAIChatRequest
		Stream bool `json:"stream"`
	}{
		openAIChatRequest: chatReq,
		Stream:            true,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", baseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	}

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported")
	}

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		if line == "data: [DONE]" {
			w.Write([]byte("data: [DONE]\n\n"))
			flusher.Flush()
			break
		}
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		var chunk openAIStreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue
		}
		if len(chunk.Choices) > 0 {
			content := chunk.Choices[0].Delta.Content
			if content != "" {
				w.Write([]byte("data: " + content + "\n\n"))
				flusher.Flush()
			}
		}
	}
	return scanner.Err()
}

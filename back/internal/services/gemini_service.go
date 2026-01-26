package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	client *genai.Client
}

// NewGeminiService Geminiサービスを初期化
func NewGeminiService() (*GeminiService, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("Warning: GEMINI_API_KEY is not set. AI task generation will be disabled.")
		return &GeminiService{client: nil}, nil
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	return &GeminiService{client: client}, nil
}

// GenerateTasks AIタスクを生成
func (s *GeminiService) GenerateTasks(eventTitle string) ([]TaskSuggestion, error) {
	if s.client == nil {
		return []TaskSuggestion{}, nil
	}

	ctx := context.Background()
	model := s.client.GenerativeModel("gemini-2.0-flash-exp")

	prompt := fmt.Sprintf(`Generate 3 high-priority tasks for an event titled "%s". 
Format them as a JSON array of objects with "title" and "deadline" (e.g., "残り 2日" or "本日締め切り").
Return only the JSON array, no other text.`, eventTitle)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no content generated")
	}

	text := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		if str, ok := part.(genai.Text); ok {
			text += string(str)
		}
	}

	var tasks []TaskSuggestion
	if err := json.Unmarshal([]byte(text), &tasks); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return tasks, nil
}

// TaskSuggestion AIが生成したタスクの提案
type TaskSuggestion struct {
	Title    string `json:"title"`
	Deadline string `json:"deadline"`
}

// Close クライアントを閉じる
func (s *GeminiService) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}

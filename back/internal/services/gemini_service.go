package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

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

// ChatMessage チャットメッセージ
type ChatMessage struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"`
}

// SuggestedEvent チャットから抽出したイベント案
type SuggestedEvent struct {
	Title    string `json:"title"`
	StartAt  string `json:"start_at"`  // RFC3339
	EndAt    string `json:"end_at"`    // RFC3339
	Location string `json:"location"`
}

const eventCreateSystemPrompt = "あなたはイベント作成アシスタントです。ユーザーと対話し、以下の情報を集めてイベントを作成します。\n" +
	"- タイトル（必須）\n- 開催日時・開始（必須）\n- 開催日時・終了（必須）\n- 場所（任意）\n\n" +
	"親しみやすく、簡潔に日本語で応答してください。情報が揃ったら、最終確認として「この内容でイベントを作成してよろしいですか？」と尋ね、ユーザーが了承したら、以下のJSON形式のみを単独のメッセージとして追加で出力してください。それ以外の説明は不要です。\n" +
	"```json\n{\"title\":\"イベント名\",\"start_at\":\"2025-02-01T10:00:00+09:00\",\"end_at\":\"2025-02-01T18:00:00+09:00\",\"location\":\"会場名\"}\n```\n" +
	"日時は必ずRFC3339形式（タイムゾーン含む）で出力してください。"

// ChatEventCreation イベント作成チャット
func (s *GeminiService) ChatEventCreation(userMessage string, history []ChatMessage) (reply string, suggested *SuggestedEvent, err error) {
	if s.client == nil {
		return "AI機能は利用できません。GEMINI_API_KEYを設定してください。", nil, nil
	}
	ctx := context.Background()
	model := s.client.GenerativeModel("gemini-2.0-flash-exp")
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(eventCreateSystemPrompt)},
	}

	var b strings.Builder
	for _, m := range history {
		b.WriteString(m.Role)
		b.WriteString(": ")
		b.WriteString(m.Content)
		b.WriteString("\n\n")
	}
	b.WriteString("user: ")
	b.WriteString(userMessage)

	resp, err := model.GenerateContent(ctx, genai.Text(b.String()))
	if err != nil {
		return "", nil, fmt.Errorf("generate: %w", err)
	}
	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "すみません、応答を生成できませんでした。", nil, nil
	}
	text := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		if str, ok := part.(genai.Text); ok {
			text += string(str)
		}
	}
	reply, suggested = parseReplyAndSuggested(text)
	return reply, suggested, nil
}

// parseReplyAndSuggested 応答本文と ```json ... ``` ブロックを分離し、SuggestedEvent をパースする
func parseReplyAndSuggested(text string) (reply string, suggested *SuggestedEvent) {
	reply = text
	// ```json ... ``` を探す
	const (
		open  = "```json"
		close = "```"
	)
	i := 0
	for {
		start := indexAt(text, open, i)
		if start < 0 {
			break
		}
		start += len(open)
		end := indexAt(text, close, start)
		if end < 0 {
			break
		}
		raw := text[start:end]
		trimmed := strings.TrimSpace(raw)
		var s SuggestedEvent
		if json.Unmarshal([]byte(trimmed), &s) == nil && s.Title != "" && s.StartAt != "" && s.EndAt != "" {
			suggested = &s
			reply = strings.TrimSpace(text[:start-len(open)] + text[end+len(close):])
			break
		}
		i = end + len(close)
	}
	if suggested == nil {
		reply = strings.TrimSpace(text)
	}
	return reply, suggested
}

func indexAt(s, sub string, from int) int {
	if from < 0 || from >= len(s) {
		return -1
	}
	idx := strings.Index(s[from:], sub)
	if idx < 0 {
		return -1
	}
	return from + idx
}

// Close クライアントを閉じる
func (s *GeminiService) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}

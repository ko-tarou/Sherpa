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
	model := s.client.GenerativeModel("gemini-2.5-flash")
	// JSON形式で出力させる（マークダウンや余分なテキストを防ぐ）
	model.GenerationConfig = genai.GenerationConfig{
		ResponseMIMEType: "application/json",
	}

	prompt := fmt.Sprintf(`イベント「%s」の運営で必要な優先度の高いタスクを3つ生成してください。
JSON配列形式で、各要素は "title" と "deadline" を持つオブジェクトにしてください。
deadline は日本語で表現してください（例：「残り2日」「本日締め切り」「1週間後」）。
JSON配列のみを返し、他のテキストは含めないでください。`, eventTitle)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no content generated")
	}

	text := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		if str, ok := part.(genai.Text); ok {
			text += string(str)
		}
	}

	tasks, err := parseTasksFromResponse(text)
	if err != nil {
		log.Printf("[GenerateTasks] raw response: %q", text)
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	return tasks, nil
}

// parseTasksFromResponse レスポンステキストからタスク配列を抽出（```json ブロックや生JSONに対応）
func parseTasksFromResponse(text string) ([]TaskSuggestion, error) {
	text = strings.TrimSpace(text)
	// ```json ... ``` ブロックを探す
	if idx := strings.Index(text, "```json"); idx >= 0 {
		start := idx + 7
		if end := strings.Index(text[start:], "```"); end >= 0 {
			text = strings.TrimSpace(text[start : start+end])
		}
	} else if idx := strings.Index(text, "```"); idx >= 0 {
		start := idx + 3
		if end := strings.Index(text[start:], "```"); end >= 0 {
			text = strings.TrimSpace(text[start : start+end])
		}
	}
	// 先頭の [ から末尾の ] までを抽出（前後の余分なテキストを除去）
	if i := strings.Index(text, "["); i >= 0 {
		if j := strings.LastIndex(text, "]"); j > i {
			text = text[i : j+1]
		}
	}

	var tasks []TaskSuggestion
	if err := json.Unmarshal([]byte(text), &tasks); err != nil {
		return nil, err
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

const eventCreateSystemPrompt = "あなたはイベント作成アシスタントです。ユーザーと対話しながら、イベント運営に必要な項目を洗い出し、不明な点は必ず聞き出してください。\n\n" +
	"【収集する項目】\n" +
	"- タイトル（必須）\n- 開始日時（必須）\n- 終了日時（必須）\n- 場所（任意）\n" +
	"- イベント種別（例：勉強会・懇親会・カンファレンス・展示会など）\n- 想定参加人数\n- 予算の有無・規模感\n- チケット販売の有無\n- その他特記事項（あれば）\n\n" +
	"【ふるまい】\n" +
	"- 不明確な項目があれば、その項目について1つずつ具体的に質問する。一度に多く聞き過ぎない。\n" +
	"- 質問するときは、選択肢や例（「例えば50人規模」「有料・無料」など）を示すと親切。\n" +
	"- ユーザーの発言から分かることはそのまま利用し、分からないことだけを尋ねる。\n" +
	"- 親しみやすく、簡潔な日本語で応答する。\n" +
	"- 通常の応答は常に自然な会話文のみ。JSONは出力しない。\n\n" +
	"【JSON出力のタイミング】\n" +
	"- タイトル・開始日時・終了日時の3つが揃うまで、JSONは絶対に出力しない。\n" +
	"- 3つ揃ったら、これまでに分かった内容（場所・種別・想定人数など）を簡潔にまとめ、「この内容でイベントを作成してよろしいですか？」と確認する。\n" +
	"- ユーザーが「はい」「よろしい」「作成して」等で了承したときだけ、応答の末尾に以下のJSONブロックを追加で出力する。それ以外の説明は不要。\n" +
	"```json\n" +
	`{"title":"イベント名","start_at":"2025-02-01T10:00:00+09:00","end_at":"2025-02-01T18:00:00+09:00","location":"会場名または空文字"}` + "\n" +
	"```\n" +
	"- 日時は必ずRFC3339形式（タイムゾーン含む、例 +09:00）で出力する。場所が未定なら \"location\":\"\" とする。"

// ChatEventCreation イベント作成チャット
func (s *GeminiService) ChatEventCreation(userMessage string, history []ChatMessage) (reply string, suggested *SuggestedEvent, err error) {
	if s.client == nil {
		return "AI機能は利用できません。GEMINI_API_KEYを設定してください。", nil, nil
	}
	ctx := context.Background()
	model := s.client.GenerativeModel("gemini-2.5-flash")
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
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
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

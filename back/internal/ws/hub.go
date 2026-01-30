package ws

import (
	"encoding/json"
	"log"
	"sync"
)

// Hub チャンネル単位で接続クライアントを管理し、メッセージをブロードキャストする
type Hub struct {
	mu sync.RWMutex
	// channelID -> connected clients
	channels   map[uint]map[*Client]struct{}
	unregister chan *Client
	broadcast  chan *BroadcastMessage
}

// BroadcastMessage 特定チャンネルへ配信するメッセージ
type BroadcastMessage struct {
	ChannelID uint            `json:"-"`
	Payload   json.RawMessage `json:"-"`
	Raw       []byte          `json:"-"` // 送信時は Raw を使用
}

// NewHub は Hub を生成する
func NewHub() *Hub {
	return &Hub{
		channels:   make(map[uint]map[*Client]struct{}),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}
}

// Run は Hub のメインループ（goroutine で起動）
func (h *Hub) Run() {
	for {
		select {
		case c := <-h.unregister:
			h.removeClient(c)

		case b := <-h.broadcast:
			h.broadcastToChannel(b)
		}
	}
}

func (h *Hub) removeClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for chID := range c.channels {
		m, ok := h.channels[chID]
		if !ok {
			continue
		}
		delete(m, c)
		if len(m) == 0 {
			delete(h.channels, chID)
		}
	}
	close(c.send)
}

// Join はクライアントをチャンネルに参加させる
func (h *Hub) Join(c *Client, channelID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.channels[channelID] == nil {
		h.channels[channelID] = make(map[*Client]struct{})
	}
	h.channels[channelID][c] = struct{}{}
	c.channels[channelID] = struct{}{}
}

// Leave はクライアントをチャンネルから退出させる
func (h *Hub) Leave(c *Client, channelID uint) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(c.channels, channelID)
	m, ok := h.channels[channelID]
	if !ok {
		return
	}
	delete(m, c)
	if len(m) == 0 {
		delete(h.channels, channelID)
	}
}

// BroadcastToChannel は指定チャンネルの全クライアントにメッセージを配信する
func (h *Hub) BroadcastToChannel(channelID uint, raw []byte) {
	h.broadcast <- &BroadcastMessage{ChannelID: channelID, Raw: raw}
}

func (h *Hub) broadcastToChannel(b *BroadcastMessage) {
	h.mu.RLock()
	m, ok := h.channels[b.ChannelID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	// 送信先をコピーしてから Unlock（送信中にロック持たない）
	clients := make([]*Client, 0, len(m))
	for c := range m {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- b.Raw:
		default:
			// バッファ満杯ならクライアントを削除
			h.unregister <- c
		}
	}
}

// Envelope クライアントへ送る JSON の共通形
type Envelope struct {
	Type    string          `json:"type"`
	Message json.RawMessage `json:"message,omitempty"`
	Error   string          `json:"error,omitempty"`
}

// ClientMessage クライアントから受信する JSON
type ClientMessage struct {
	Type      string `json:"type"`
	ChannelID uint   `json:"channel_id"`
}

// BuildMessageEvent は type: "message" のペイロードを組み立てる
func BuildMessageEvent(msgJSON []byte) []byte {
	e := Envelope{Type: "message", Message: msgJSON}
	b, _ := json.Marshal(e)
	return b
}

// BuildErrorEvent は type: "error" のペイロードを組み立てる
func BuildErrorEvent(err string) []byte {
	e := Envelope{Type: "error", Error: err}
	b, _ := json.Marshal(e)
	return b
}

func logWS(err error, msg string) {
	if err != nil {
		log.Printf("[ws] %s: %v", msg, err)
	}
}

// DefaultHub は main で設定する。CreateMessage 等からブロードキャストに利用する
var DefaultHub *Hub

// BroadcastMessageToChannel はメッセージ JSON を指定チャンネルに配信する。DefaultHub が nil なら何もしない
func BroadcastMessageToChannel(channelID uint, msgJSON []byte) {
	if DefaultHub == nil {
		return
	}
	raw := BuildMessageEvent(msgJSON)
	DefaultHub.BroadcastToChannel(channelID, raw)
}

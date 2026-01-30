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
	ChannelID     uint  `json:"-"`
	Raw           []byte `json:"-"`
	ExcludeUserID *uint  `json:"-"` // 指定時はこのユーザーを除外
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
	h.broadcast <- &BroadcastMessage{ChannelID: channelID, Raw: raw, ExcludeUserID: nil}
}

// BroadcastToChannelExcludingUser は指定ユーザーを除くチャンネルメンバーに配信する
func (h *Hub) BroadcastToChannelExcludingUser(channelID uint, excludeUserID uint, raw []byte) {
	uid := excludeUserID
	h.broadcast <- &BroadcastMessage{ChannelID: channelID, Raw: raw, ExcludeUserID: &uid}
}

func (h *Hub) broadcastToChannel(b *BroadcastMessage) {
	h.mu.RLock()
	m, ok := h.channels[b.ChannelID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	clients := make([]*Client, 0, len(m))
	for c := range m {
		if b.ExcludeUserID != nil && c.userID == *b.ExcludeUserID {
			continue
		}
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- b.Raw:
		default:
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
	UserName  string `json:"user_name"`
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

// BuildEvent は任意の type のイベントを組み立てる
func BuildEvent(typ string, payload []byte) []byte {
	e := map[string]interface{}{"type": typ}
	if len(payload) > 0 {
		var p interface{}
		_ = json.Unmarshal(payload, &p)
		e["payload"] = p
	}
	b, _ := json.Marshal(e)
	return b
}

// BroadcastEventToChannel は type と payload を指定してチャンネルに配信する
func BroadcastEventToChannel(channelID uint, typ string, payload []byte) {
	if DefaultHub == nil {
		return
	}
	raw := BuildEvent(typ, payload)
	DefaultHub.BroadcastToChannel(channelID, raw)
}

// BroadcastTypingToChannelExcluding は typing イベントを送信者以外のチャンネルメンバーに配信する
func BroadcastTypingToChannelExcluding(channelID uint, excludeUserID uint, payload []byte) {
	if DefaultHub == nil {
		return
	}
	DefaultHub.BroadcastToChannelExcludingUser(channelID, excludeUserID, BuildEvent("typing", payload))
}

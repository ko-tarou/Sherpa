package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Client は WebSocket 接続されたクライアント
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID uint
	channels map[uint]struct{}
}

// ServeWS は HTTP を WebSocket にアップグレードし、クライアントを起動する
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID uint) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade: %v", err)
		return
	}

	c := &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		channels: make(map[uint]struct{}),
	}

	go c.writePump()
	c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logWS(err, "read")
			}
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			c.send <- BuildErrorEvent("invalid json")
			continue
		}

		switch msg.Type {
		case "join":
			if msg.ChannelID == 0 {
				c.send <- BuildErrorEvent("channel_id required")
				continue
			}
			c.hub.Join(c, msg.ChannelID)
		case "leave":
			if msg.ChannelID == 0 {
				continue
			}
			c.hub.Leave(c, msg.ChannelID)
		case "typing", "typing_stop":
			if msg.ChannelID == 0 {
				continue
			}
			payload, _ := json.Marshal(map[string]interface{}{
				"user_id":   c.userID,
				"user_name": msg.UserName,
				"typing":    msg.Type == "typing",
			})
			BroadcastTypingToChannelExcluding(msg.ChannelID, c.userID, payload)
		default:
			c.send <- BuildErrorEvent("unknown type: " + msg.Type)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case data, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				logWS(err, "write")
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

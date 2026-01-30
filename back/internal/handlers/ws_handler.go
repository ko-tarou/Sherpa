package handlers

import (
	"net/http"

	"sherpa-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

// WSHandler は GET /api/ws?token=xxx で WebSocket 接続を処理する
func WSHandler(hub *ws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
			return
		}

		userID, err := VerifyToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		ws.ServeWS(hub, c.Writer, c.Request, userID)
	}
}

package handlers

import (
	"log"
	"net/http"

	"sherpa-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// CreateEventChatRequest リクエスト
type CreateEventChatRequest struct {
	Message string                   `json:"message" binding:"required"`
	History []services.ChatMessage   `json:"history"`
}

// CreateEventChat イベント作成AIチャット
func CreateEventChat(c *gin.Context) {
	var req CreateEventChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.History == nil {
		req.History = []services.ChatMessage{}
	}

	svc, err := services.NewGeminiService()
	if err != nil {
		log.Printf("[create-chat] NewGeminiService: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service unavailable"})
		return
	}
	defer svc.Close()

	reply, suggested, err := svc.ChatEventCreation(req.Message, req.History)
	if err != nil {
		log.Printf("[create-chat] ChatEventCreation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := gin.H{"reply": reply}
	if suggested != nil {
		out["suggestedEvent"] = suggested
	}
	c.JSON(http.StatusOK, out)
}

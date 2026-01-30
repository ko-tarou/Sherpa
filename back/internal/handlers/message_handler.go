package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"
	"sherpa-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

// UpdateMessage メッセージ編集（投稿者のみ）
func UpdateMessage(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	msgID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var msg models.Message
	if err := database.DB.First(&msg, uint(msgID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	var ch models.Channel
	if database.DB.First(&ch, msg.ChannelID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	var staff models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ?", ch.EventID, uid).First(&staff).Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event staff can edit messages"})
		return
	}
	if msg.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the author can edit"})
		return
	}
	if msg.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot edit deleted message"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	msg.Content = req.Content
	if err := database.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("User").Preload("Reactions").Preload("Reactions.User").First(&msg, msg.ID)

	if b, err := json.Marshal(msg); err == nil {
		ws.BroadcastEventToChannel(msg.ChannelID, "message_updated", b)
	}
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

// DeleteMessage メッセージ削除（投稿者のみ・論理削除）
func DeleteMessage(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	msgID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var msg models.Message
	if err := database.DB.First(&msg, uint(msgID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	var ch models.Channel
	if database.DB.First(&ch, msg.ChannelID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	var staff models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ?", ch.EventID, uid).First(&staff).Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event staff can delete messages"})
		return
	}
	if msg.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the author can delete"})
		return
	}

	msg.IsDeleted = true
	if err := database.DB.Save(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	payload, _ := json.Marshal(gin.H{"message_id": msg.ID, "channel_id": msg.ChannelID})
	ws.BroadcastEventToChannel(msg.ChannelID, "message_deleted", payload)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

const defaultEmoji = "👍"

// ToggleReaction リアクションのトグル（追加 or 削除）
func ToggleReaction(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	msgID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	var msg models.Message
	if err := database.DB.First(&msg, uint(msgID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	var ch models.Channel
	if database.DB.First(&ch, msg.ChannelID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	var staff models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ?", ch.EventID, uid).First(&staff).Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event staff can add reactions"})
		return
	}
	if msg.IsDeleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot react to deleted message"})
		return
	}

	var req struct {
		Emoji string `json:"emoji"`
	}
	_ = c.ShouldBindJSON(&req)
	emoji := req.Emoji
	if emoji == "" {
		emoji = defaultEmoji
	}

	var existing models.MessageReaction
	err = database.DB.Where("message_id = ? AND user_id = ? AND emoji = ?", msgID, uid, emoji).First(&existing).Error
	if err == nil {
		if database.DB.Delete(&existing).Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove reaction"})
			return
		}
		payload, _ := json.Marshal(gin.H{"message_id": msg.ID, "channel_id": msg.ChannelID, "user_id": uid, "emoji": emoji, "action": "remove"})
		ws.BroadcastEventToChannel(msg.ChannelID, "reaction", payload)
		c.JSON(http.StatusOK, gin.H{"action": "removed", "emoji": emoji})
		return
	}

	r := models.MessageReaction{MessageID: uint(msgID), UserID: uid, Emoji: emoji}
	if err := database.DB.Create(&r).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("User").First(&r, r.ID)

	payload, _ := json.Marshal(r)
	ws.BroadcastEventToChannel(msg.ChannelID, "reaction", payload)
	c.JSON(http.StatusOK, gin.H{"action": "added", "reaction": r})
}

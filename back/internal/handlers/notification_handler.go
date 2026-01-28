package handlers

import (
	"net/http"
	"strconv"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetUnreadNotificationCount 未読通知件数
func GetUnreadNotificationCount(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	var n int64
	if err := database.DB.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", uid).Count(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": n})
}

// GetNotifications 自分の通知一覧
func GetNotifications(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var list []models.Notification
	if err := database.DB.Where("user_id = ?", uid).Order("created_at DESC").Limit(100).Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"notifications": list})
}

// MarkNotificationRead 既読にする
func MarkNotificationRead(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	var n models.Notification
	if err := database.DB.First(&n, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}
	if n.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not your notification"})
		return
	}

	database.DB.Exec("UPDATE notifications SET read_at = NOW() WHERE id = ?", id)

	database.DB.First(&n, uint(id))
	c.JSON(http.StatusOK, gin.H{"notification": n})
}

// GetMyPendingInvitations 自分あての未承諾招待一覧（通知と重複するが用途に応じて）
func GetMyPendingInvitations(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var list []models.EventInvitation
	if err := database.DB.Where("user_id = ? AND status = ?", uid, models.InvitationStatusPending).
		Preload("Event").Preload("Inviter").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invitations": list})
}

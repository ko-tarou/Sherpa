package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"
	"sherpa-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

// ensureDefaultChannels イベントにチャンネルがなければ #全体 を作成し、全スタッフをメンバーに
func ensureDefaultChannels(eventID uint) error {
	var n int64
	if database.DB.Model(&models.Channel{}).Where("event_id = ?", eventID).Count(&n); n > 0 {
		return nil
	}
	desc := "このチャンネルはイベント全体の連絡事項を確認するための場所です。"
	c := models.Channel{
		EventID:     eventID,
		Name:        "#全体",
		Description: &desc,
		IsPrivate:   false,
	}
	if err := database.DB.Create(&c).Error; err != nil {
		return err
	}
	var staffIDs []uint
	database.DB.Model(&models.EventStaff{}).Where("event_id = ?", eventID).Pluck("user_id", &staffIDs)
	for _, uid := range staffIDs {
		m := models.ChannelMember{ChannelID: c.ID, UserID: uid}
		_ = database.DB.Create(&m).Error
	}
	return nil
}

// GetChannels イベントのチャンネル一覧。チャンネルがなければ #全体 を自動作成。
func GetChannels(c *gin.Context) {
	_, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	if err := ensureDefaultChannels(uint(eventID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var list []models.Channel
	if err := database.DB.Where("event_id = ?", eventID).Order("is_private ASC").Order("name ASC").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"channels": list})
}

type createChannelRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	IsPrivate   bool   `json:"is_private"`
}

// CreateChannel チャンネル作成（イベントAdmin用）
func CreateChannel(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var staff models.EventStaff
	if err := database.DB.Where("event_id = ? AND user_id = ? AND role = ?", eventID, uid, "Admin").First(&staff).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can create channels"})
		return
	}

	var req createChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	if name[0] != '#' {
		name = "#" + name
	}
	var desc *string
	if req.Description != "" {
		desc = &req.Description
	}

	ch := models.Channel{EventID: uint(eventID), Name: name, Description: desc, IsPrivate: req.IsPrivate}
	if err := database.DB.Create(&ch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	m := models.ChannelMember{ChannelID: ch.ID, UserID: uid}
	_ = database.DB.Create(&m).Error

	c.JSON(http.StatusCreated, gin.H{"channel": ch})
}

// GetMessages チャンネルのメッセージ一覧（親のみ・スレッドは除く）
func GetMessages(c *gin.Context) {
	_, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var ch models.Channel
	if err := database.DB.First(&ch, uint(channelID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	var list []models.Message
	if err := database.DB.Where("channel_id = ? AND parent_message_id IS NULL AND is_deleted = ?", channelID, false).
		Preload("User").
		Order("created_at ASC").
		Limit(100).
		Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": list})
}

type createMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

// CreateMessage メッセージ送信
func CreateMessage(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var ch models.Channel
	if err := database.DB.First(&ch, uint(channelID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}

	var staff models.EventStaff
	if err := database.DB.Where("event_id = ? AND user_id = ?", ch.EventID, uid).First(&staff).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event staff can post"})
		return
	}

	var req createMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := models.Message{ChannelID: uint(channelID), UserID: uid, Content: req.Content}
	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("User").First(&msg, msg.ID)

	// 保存成功後、同じチャンネルのクライアントへ WebSocket で配信
	if b, err := json.Marshal(msg); err == nil {
		ws.BroadcastMessageToChannel(uint(channelID), b)
	}

	c.JSON(http.StatusCreated, gin.H{"message": msg})
}

// requireChannelAdmin チャンネルのイベントAdminか確認。ch は Load 済みであること。
func requireChannelAdmin(c *gin.Context, ch *models.Channel, uid uint) bool {
	var staff models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ? AND role = ?", ch.EventID, uid, "Admin").First(&staff).Error != nil {
		return false
	}
	return true
}

type updateChannelRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsPrivate   *bool   `json:"is_private"`
}

// UpdateChannel チャンネル更新（Admin用）
func UpdateChannel(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var ch models.Channel
	if database.DB.First(&ch, uint(channelID)).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	if !requireChannelAdmin(c, &ch, uid) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can update channels"})
		return
	}

	var req updateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid body"})
		return
	}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name != "" {
			if name[0] != '#' {
				name = "#" + name
			}
			ch.Name = name
		}
	}
	if req.Description != nil {
		ch.Description = req.Description
	}
	if req.IsPrivate != nil {
		ch.IsPrivate = *req.IsPrivate
	}
	if database.DB.Save(&ch).Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"channel": ch})
}

// DeleteChannel チャンネル削除（Admin用）.#全体は削除不可
func DeleteChannel(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var ch models.Channel
	if database.DB.First(&ch, uint(channelID)).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	if !requireChannelAdmin(c, &ch, uid) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can delete channels"})
		return
	}
	if ch.Name == "#全体" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "#全体 チャンネルは削除できません"})
		return
	}

	if database.DB.Delete(&ch).Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GetChannelMembers チャンネルメンバー一覧
func GetChannelMembers(c *gin.Context) {
	_, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var list []models.ChannelMember
	if database.DB.Where("channel_id = ?", channelID).Preload("User").Find(&list).Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"members": list})
}

type addChannelMemberRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

// AddChannelMember メンバー追加（Admin用）
func AddChannelMember(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}

	var ch models.Channel
	if database.DB.First(&ch, uint(channelID)).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	if !requireChannelAdmin(c, &ch, uid) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can add members"})
		return
	}

	var req addChannelMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id required"})
		return
	}

	var staff models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ?", ch.EventID, req.UserID).First(&staff).Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーはイベントスタッフではありません"})
		return
	}

	var exist models.ChannelMember
	if database.DB.Where("channel_id = ? AND user_id = ?", channelID, req.UserID).First(&exist).Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "既にメンバーです"})
		return
	}

	m := models.ChannelMember{ChannelID: uint(channelID), UserID: req.UserID}
	if database.DB.Create(&m).Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("User").First(&m, m.ID)
	c.JSON(http.StatusCreated, gin.H{"member": m})
}

// RemoveChannelMember メンバー削除（Admin用）
func RemoveChannelMember(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	channelID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid channel ID"})
		return
	}
	userID, err2 := strconv.ParseUint(c.Param("userId"), 10, 32)
	if err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var ch models.Channel
	if database.DB.First(&ch, uint(channelID)).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Channel not found"})
		return
	}
	if !requireChannelAdmin(c, &ch, uid) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can remove members"})
		return
	}

	if database.DB.Where("channel_id = ? AND user_id = ?", channelID, userID).Delete(&models.ChannelMember{}).Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

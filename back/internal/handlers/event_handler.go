package handlers

import (
	"net/http"
	"strconv"
	"time"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"
	"sherpa-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

// GetEvents イベント一覧を取得
func GetEvents(c *gin.Context) {
	var events []models.Event
	if err := database.DB.Preload("Organization").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// GetEvent イベント詳細を取得
func GetEvent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := database.DB.Preload("Organization").
		Preload("EventStaffs.User").
		Preload("Tasks").
		Preload("Budgets").
		First(&event, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// CreateEventRequest イベント作成リクエスト（user_id で作成者を紐付け）
type CreateEventRequest struct {
	OrganizationID uint   `json:"organization_id" binding:"required"`
	Title          string `json:"title" binding:"required"`
	StartAt        string `json:"start_at" binding:"required"`
	EndAt          string `json:"end_at" binding:"required"`
	Location       string `json:"location"`
	Status         string `json:"status"`
	UserID         *uint  `json:"user_id"` // 作成者。指定時は EventStaff Admin として登録
}

// CreateEvent イベントを作成し、user_id があれば EventStaff として登録
func CreateEvent(c *gin.Context) {
	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_at: " + err.Error()})
		return
	}
	endAt, err := time.Parse(time.RFC3339, req.EndAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_at: " + err.Error()})
		return
	}

	status := models.EventStatus(req.Status)
	if status == "" {
		status = models.EventStatusDraft
	}

	event := models.Event{
		OrganizationID: req.OrganizationID,
		Title:          req.Title,
		StartAt:        startAt,
		EndAt:          endAt,
		Location:       strPtr(req.Location),
		Status:         status,
	}
	if err := database.DB.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.UserID != nil && *req.UserID != 0 {
		staff := models.EventStaff{EventID: event.ID, UserID: *req.UserID, Role: "Admin"}
		_ = database.DB.Create(&staff).Error
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// UpdateEvent イベントを更新
func UpdateEvent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := database.DB.First(&event, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.BroadcastCalendarUpdate(uint(id))
	c.JSON(http.StatusOK, gin.H{"event": event})
}

// DeleteEvent イベントを削除
func DeleteEvent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	if err := database.DB.Delete(&models.Event{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

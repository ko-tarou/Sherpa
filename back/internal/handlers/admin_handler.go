package handlers

import (
	"net/http"
	"os"
	"strings"

	"sherpa-backend/internal/batch"
	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
)

const adminKeyHeader = "X-Admin-Key"
const adminBearerPrefix = "Bearer "

// AdminMiddleware ADMIN_API_KEY で認証。X-Admin-Key または Authorization: Bearer <key>
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := os.Getenv("ADMIN_API_KEY")
		if key == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Admin API key not configured"})
			c.Abort()
			return
		}

		var provided string
		if v := c.GetHeader(adminKeyHeader); v != "" {
			provided = strings.TrimSpace(v)
		} else if v := c.GetHeader("Authorization"); strings.HasPrefix(v, adminBearerPrefix) {
			provided = strings.TrimSpace(strings.TrimPrefix(v, adminBearerPrefix))
		}
		if provided != key {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing admin key"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// AdminEventRow 管理者用イベント一覧の1行
type AdminEventRow struct {
	ID             uint   `json:"id"`
	Title          string `json:"title"`
	StartAt        string `json:"start_at"`
	EndAt          string `json:"end_at"`
	Location       string `json:"location,omitempty"`
	Status         string `json:"status"`
	StaffCount     int    `json:"staff_count"`
	TaskTodo       int    `json:"task_todo"`
	TaskInProgress int    `json:"task_in_progress"`
	TaskCompleted  int    `json:"task_completed"`
	ChannelCount   int    `json:"channel_count"`
	CreatedAt      string `json:"created_at"`
}

// GetAdminEvents 全イベント一覧（管理者用）。スタッフ数・タスク内訳・チャンネル数を含む。
func GetAdminEvents(c *gin.Context) {
	var events []models.Event
	if err := database.DB.
		Preload("EventStaffs").
		Preload("Tasks").
		Preload("Channels").
		Order("created_at DESC").
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rows := make([]AdminEventRow, 0, len(events))
	for _, e := range events {
		todo, ip, done := 0, 0, 0
		for _, t := range e.Tasks {
			switch t.Status {
			case models.TaskStatusTodo:
				todo++
			case models.TaskStatusInProgress:
				ip++
			case models.TaskStatusCompleted:
				done++
			}
		}
		loc := ""
		if e.Location != nil {
			loc = *e.Location
		}
		rows = append(rows, AdminEventRow{
			ID:             e.ID,
			Title:          e.Title,
			StartAt:        e.StartAt.Format("2006-01-02 15:04"),
			EndAt:          e.EndAt.Format("2006-01-02 15:04"),
			Location:       loc,
			Status:         string(e.Status),
			StaffCount:     len(e.EventStaffs),
			TaskTodo:       todo,
			TaskInProgress: ip,
			TaskCompleted:  done,
			ChannelCount:   len(e.Channels),
			CreatedAt:      e.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	c.JSON(http.StatusOK, gin.H{"events": rows})
}

// RunBatch バッチ処理を実行する（管理者用）
func RunBatch(c *gin.Context) {
	result, err := batch.Run()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"ok":               true,
		"channels_deleted": result.ChannelsDeleted,
		"events_deleted":   result.EventsDeleted,
	})
}

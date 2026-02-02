package handlers

import (
	"net/http"
	"strconv"
	"time"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"
	"sherpa-backend/internal/services"
	"sherpa-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

func parseTime(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, nil
	}
	return time.Parse(time.RFC3339, s)
}

func parseTimePtr(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil
	}
	return &t
}

func loadTaskWithAssignees(task *models.Task) {
	database.DB.Preload("Assignee").Preload("Assignees").Preload("Assignees.User").First(task, task.ID)
}

// GetTasks タスク一覧を取得
func GetTasks(c *gin.Context) {
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var tasks []models.Task
	if err := database.DB.Where("event_id = ?", uint(eventID)).
		Preload("Assignee").
		Preload("Assignees").
		Preload("Assignees.User").
		Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": tasks})
}

// TaskCreateRequest タスク作成リクエスト
type TaskCreateRequest struct {
	Title         string                 `json:"title"`
	Link          string                 `json:"link"`
	Links         []string               `json:"links"`
	StartAt       *string                `json:"start_at"`
	Deadline      string                 `json:"deadline"`
	Recurrence    *models.RecurrenceRule `json:"recurrence"`
	Status        models.TaskStatus      `json:"status"`
	IsAIGenerated bool                   `json:"is_ai_generated"`
	AssigneeIDs   []uint                 `json:"assignee_ids"`
}

// CreateTask タスクを作成
func CreateTask(c *gin.Context) {
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var req TaskCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deadline, err := parseTime(req.Deadline)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid deadline"})
		return
	}

	task := models.Task{
		EventID:       uint(eventID),
		Title:         req.Title,
		Link:          req.Link,
		Links:         req.Links,
		StartAt:       parseTimePtr(req.StartAt),
		Deadline:      deadline,
		Recurrence:    req.Recurrence,
		Status:        req.Status,
		IsAIGenerated: req.IsAIGenerated,
	}
	if task.Status == "" {
		task.Status = models.TaskStatusTodo
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(req.AssigneeIDs) > 0 {
		for _, uid := range req.AssigneeIDs {
			database.DB.Create(&models.TaskAssignee{TaskID: task.ID, UserID: uid})
		}
	}

	loadTaskWithAssignees(&task)
	ws.BroadcastCalendarUpdate(uint(eventID))
	c.JSON(http.StatusCreated, gin.H{"task": task})
}

// TaskUpdateRequest タスク更新リクエスト
type TaskUpdateRequest struct {
	Title       *string                 `json:"title"`
	Link        *string                 `json:"link"`
	Links       []string                `json:"links"`
	StartAt     *string                 `json:"start_at"`
	Deadline    *string                 `json:"deadline"`
	Recurrence  *models.RecurrenceRule  `json:"recurrence"`
	Status      *models.TaskStatus      `json:"status"`
	AssigneeIDs []uint                  `json:"assignee_ids"`
}

// UpdateTask タスクを更新
func UpdateTask(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := database.DB.First(&task, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var req TaskUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Link != nil {
		task.Link = *req.Link
	}
	if req.Links != nil {
		task.Links = req.Links
	}
	if req.StartAt != nil {
		task.StartAt = parseTimePtr(req.StartAt)
	}
	if req.Deadline != nil {
		t, err := parseTime(*req.Deadline)
		if err == nil {
			task.Deadline = t
		}
	}
	if req.Recurrence != nil {
		task.Recurrence = req.Recurrence
	}
	if req.Status != nil {
		task.Status = *req.Status
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.AssigneeIDs != nil {
		database.DB.Where("task_id = ?", task.ID).Delete(&models.TaskAssignee{})
		for _, uid := range req.AssigneeIDs {
			database.DB.Create(&models.TaskAssignee{TaskID: task.ID, UserID: uid})
		}
	}

	loadTaskWithAssignees(&task)
	ws.BroadcastCalendarUpdate(task.EventID)
	c.JSON(http.StatusOK, gin.H{"task": task})
}

// DeleteTask タスクを削除
func DeleteTask(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := database.DB.First(&task, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if err := database.DB.Delete(&models.Task{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ws.BroadcastCalendarUpdate(task.EventID)
	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}

// GenerateTasks AIタスクを生成
func GenerateTasks(c *gin.Context) {
	var req struct {
		EventTitle string `json:"eventTitle" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	geminiService, err := services.NewGeminiService()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize AI service"})
		return
	}
	defer geminiService.Close()

	suggestions, err := geminiService.GenerateTasks(req.EventTitle)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tasks": suggestions})
}

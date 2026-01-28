package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
)

const defaultOrgID = 1

// CreateUserRequest ユーザー作成リクエスト
type CreateUserRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required"`
}

// CreateUser ユーザーを作成し、デフォルト組織に追加
func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	if database.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count); count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "このメールアドレスは既に登録されています"})
		return
	}
	user := models.User{Name: req.Name, Email: req.Email}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー作成に失敗しました"})
		return
	}

	member := models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: defaultOrgID,
		Role:           "member",
	}
	if err := database.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "組織への追加に失敗しました"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// SearchUsers ユーザー名で検索（認証必須・全ユーザー対象）
func SearchUsers(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, gin.H{"users": []models.User{}})
		return
	}
	var users []models.User
	pattern := "%" + q + "%"
	if err := database.DB.Where("name ILIKE ? OR email ILIKE ?", pattern, pattern).
		Limit(30).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

// GetUser ユーザー詳細を取得
func GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// GetUserEvents ユーザーが EventStaff として参加しているイベント一覧を取得（ロール不問）
func GetUserEvents(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var eventIDs []uint
	if err := database.DB.Model(&models.EventStaff{}).
		Where("user_id = ?", uint(id)).
		Pluck("event_id", &eventIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(eventIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"events": []models.Event{}})
		return
	}

	var events []models.Event
	if err := database.DB.Preload("Organization").
		Where("id IN ?", eventIDs).
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

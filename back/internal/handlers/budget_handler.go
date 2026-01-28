package handlers

import (
	"net/http"
	"strconv"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GetBudgets イベントに紐づく予算一覧を取得
func GetBudgets(c *gin.Context) {
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var budgets []models.Budget
	if err := database.DB.Where("event_id = ?", uint(eventID)).Find(&budgets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"budgets": budgets})
}

type createBudgetRequest struct {
	Category      string `json:"category" binding:"required"`
	Type          string `json:"type" binding:"required"` // "income" | "expense"
	PlannedAmount int    `json:"planned_amount"`
	ActualAmount  int    `json:"actual_amount"`
}

// CreateBudget 予算項目を追加
func CreateBudget(c *gin.Context) {
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var req createBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	t := models.BudgetType(req.Type)
	if t != models.BudgetTypeIncome && t != models.BudgetTypeExpense {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'income' or 'expense'"})
		return
	}

	b := models.Budget{
		EventID:       uint(eventID),
		Category:      req.Category,
		Type:          t,
		PlannedAmount: req.PlannedAmount,
		ActualAmount:  req.ActualAmount,
	}
	if err := database.DB.Create(&b).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"budget": b})
}

type updateBudgetRequest struct {
	Category      *string `json:"category"`
	Type          *string `json:"type"`
	PlannedAmount *int    `json:"planned_amount"`
	ActualAmount  *int    `json:"actual_amount"`
}

// UpdateBudget 予算項目を更新
func UpdateBudget(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID"})
		return
	}

	var b models.Budget
	if err := database.DB.First(&b, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	var req updateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Category != nil {
		b.Category = *req.Category
	}
	if req.Type != nil {
		t := models.BudgetType(*req.Type)
		if t != models.BudgetTypeIncome && t != models.BudgetTypeExpense {
			c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'income' or 'expense'"})
			return
		}
		b.Type = t
	}
	if req.PlannedAmount != nil {
		b.PlannedAmount = *req.PlannedAmount
	}
	if req.ActualAmount != nil {
		b.ActualAmount = *req.ActualAmount
	}

	if err := database.DB.Save(&b).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"budget": b})
}

// DeleteBudget 予算項目を削除
func DeleteBudget(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID"})
		return
	}

	if err := database.DB.Delete(&models.Budget{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

package models

import (
	"time"

	"gorm.io/gorm"
)

// BudgetType 予算タイプ
type BudgetType string

const (
	BudgetTypeIncome  BudgetType = "income"
	BudgetTypeExpense BudgetType = "expense"
)

// Budget 予算モデル
type Budget struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	EventID       uint           `gorm:"not null;index" json:"event_id"`
	Category      string         `gorm:"not null" json:"category"` // カテゴリ名
	Type          BudgetType     `gorm:"type:varchar(20);not null" json:"type"`
	PlannedAmount int            `gorm:"not null;default:0" json:"planned_amount"`
	ActualAmount  int            `gorm:"default:0" json:"actual_amount"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event Event `gorm:"foreignKey:EventID" json:"event,omitempty"`
}

// TableName テーブル名を指定
func (Budget) TableName() string {
	return "budgets"
}

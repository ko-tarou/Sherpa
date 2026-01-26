package models

import (
	"time"

	"gorm.io/gorm"
)

// TaskStatus タスクステータス
type TaskStatus string

const (
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// Task タスクモデル
type Task struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	EventID        uint           `gorm:"not null;index" json:"event_id"`
	AssigneeID     *uint          `gorm:"index" json:"assignee_id,omitempty"`
	Title          string         `gorm:"not null" json:"title"`
	Deadline       time.Time      `gorm:"not null" json:"deadline"`
	Status         TaskStatus     `gorm:"type:varchar(20);default:'todo'" json:"status"`
	IsAIGenerated  bool           `gorm:"default:false" json:"is_ai_generated"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event    Event `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Assignee *User `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

// TableName テーブル名を指定
func (Task) TableName() string {
	return "tasks"
}

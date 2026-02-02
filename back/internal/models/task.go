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

// RecurrenceRule 周期設定（JSON保存）
type RecurrenceRule struct {
	Type      string `json:"type"`       // "weekly", "daily", "monthly"
	Weekdays  []int  `json:"weekdays"`   // 0=日..6=土
	StartTime string `json:"start_time"` // "09:00"
	EndTime   string `json:"end_time"`   // "17:00"
}

// Task タスクモデル
type Task struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	EventID       uint           `gorm:"not null;index" json:"event_id"`
	AssigneeID    *uint          `gorm:"index" json:"assignee_id,omitempty"` // 後方互換
	Title         string         `gorm:"not null" json:"title"`
	Link       string          `gorm:"type:text" json:"link,omitempty"`
	Links      []string        `gorm:"serializer:json" json:"links,omitempty"`
	StartAt       *time.Time     `gorm:"index" json:"start_at,omitempty"`
	Deadline      time.Time      `gorm:"not null;index" json:"deadline"`
	Recurrence    *RecurrenceRule `gorm:"serializer:json" json:"recurrence,omitempty"`
	Status        TaskStatus     `gorm:"type:varchar(20);default:'todo'" json:"status"`
	IsAIGenerated bool           `gorm:"default:false" json:"is_ai_generated"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event     Event          `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Assignee  *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	Assignees []TaskAssignee `gorm:"foreignKey:TaskID" json:"assignees,omitempty"`
}

// TableName テーブル名を指定
func (Task) TableName() string {
	return "tasks"
}

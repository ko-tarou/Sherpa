package models

import (
	"time"

	"gorm.io/gorm"
)

// EventStatus イベントステータス
type EventStatus string

const (
	EventStatusDraft     EventStatus = "draft"
	EventStatusPublished EventStatus = "published"
	EventStatusOngoing   EventStatus = "ongoing"
	EventStatusCompleted EventStatus = "completed"
	EventStatusCancelled EventStatus = "cancelled"
)

// Event イベントモデル
type Event struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	OrganizationID uint           `gorm:"not null;index" json:"organization_id"`
	Title          string         `gorm:"not null" json:"title"`
	StartAt        time.Time      `gorm:"not null" json:"start_at"`
	EndAt          time.Time      `gorm:"not null" json:"end_at"`
	Location       *string        `json:"location,omitempty"`
	Status         EventStatus    `gorm:"type:varchar(20);default:'draft'" json:"status"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Organization   Organization     `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Tasks          []Task           `json:"tasks,omitempty"`
	Budgets        []Budget         `json:"budgets,omitempty"`
	Meetings       []Meeting        `json:"meetings,omitempty"`
	EventStaffs    []EventStaff     `json:"event_staffs,omitempty"`
	Tickets        []Ticket         `json:"tickets,omitempty"`
	Channels       []Channel        `json:"channels,omitempty"`
}

// TableName テーブル名を指定
func (Event) TableName() string {
	return "events"
}

// EventStaff イベントスタッフモデル
type EventStaff struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	EventID   uint           `gorm:"not null;index" json:"event_id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Role      string         `gorm:"not null" json:"role"` // Admin, Staff, Sponsor
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event Event `gorm:"foreignKey:EventID" json:"event,omitempty"`
	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (EventStaff) TableName() string {
	return "event_staffs"
}

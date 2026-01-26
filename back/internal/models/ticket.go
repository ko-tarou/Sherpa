package models

import (
	"time"

	"gorm.io/gorm"
)

// Ticket チケットモデル
type Ticket struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	EventID   uint           `gorm:"not null;index" json:"event_id"`
	Name      string         `gorm:"not null" json:"name"`
	Price     int            `gorm:"not null;default:0" json:"price"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event             Event             `gorm:"foreignKey:EventID" json:"event,omitempty"`
	EventParticipants []EventParticipant `gorm:"foreignKey:TicketID" json:"event_participants,omitempty"`
}

// TableName テーブル名を指定
func (Ticket) TableName() string {
	return "tickets"
}

// ParticipantStatus 参加者ステータス
type ParticipantStatus string

const (
	ParticipantStatusPending  ParticipantStatus = "pending"
	ParticipantStatusConfirmed ParticipantStatus = "confirmed"
	ParticipantStatusCancelled ParticipantStatus = "cancelled"
)

// EventParticipant イベント参加者モデル
type EventParticipant struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	TicketID  uint             `gorm:"not null;index" json:"ticket_id"`
	UserID    uint             `gorm:"not null;index" json:"user_id"`
	Status    ParticipantStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`

	// Relations
	Ticket Ticket `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (EventParticipant) TableName() string {
	return "event_participants"
}

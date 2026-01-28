package models

import (
	"time"

	"gorm.io/gorm"
)

// NotificationType 通知種別
type NotificationType string

const (
	NotificationTypeEventInvite NotificationType = "event_invite"
)

// Notification 通知
type Notification struct {
	ID         uint             `gorm:"primaryKey" json:"id"`
	UserID     uint             `gorm:"not null;index" json:"user_id"`
	Type       NotificationType  `gorm:"type:varchar(32);not null" json:"type"`
	Title      string           `gorm:"not null" json:"title"`
	Body       string           `json:"body"`
	RelatedID  uint             `json:"related_id"`  // invitation_id etc.
	RelatedTyp string           `gorm:"size:32" json:"related_type"`
	ReadAt     *time.Time       `json:"read_at,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
	DeletedAt  gorm.DeletedAt   `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Notification) TableName() string {
	return "notifications"
}

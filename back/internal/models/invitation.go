package models

import (
	"time"

	"gorm.io/gorm"
)

// InvitationStatus 招待ステータス
type InvitationStatus string

const (
	InvitationStatusPending  InvitationStatus = "pending"
	InvitationStatusAccepted InvitationStatus = "accepted"
	InvitationStatusDeclined InvitationStatus = "declined"
)

// EventInvitation イベント招待
type EventInvitation struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	EventID   uint             `gorm:"not null;index" json:"event_id"`
	InviterID uint             `gorm:"not null;index" json:"inviter_id"`
	UserID    uint             `gorm:"not null;index" json:"user_id"` // 招待相手
	Role      string           `gorm:"not null" json:"role"`
	Status    InvitationStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`

	Event  Event  `gorm:"foreignKey:EventID" json:"event,omitempty"`
	Inviter User  `gorm:"foreignKey:InviterID" json:"inviter,omitempty"`
	User   User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (EventInvitation) TableName() string {
	return "event_invitations"
}

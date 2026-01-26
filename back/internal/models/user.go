package models

import (
	"time"

	"gorm.io/gorm"
)

// User ユーザーモデル
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	AvatarURL *string        `json:"avatar_url,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	OrganizationMembers []OrganizationMember `gorm:"foreignKey:UserID" json:"organization_members,omitempty"`
	EventStaffs         []EventStaff         `gorm:"foreignKey:UserID" json:"event_staffs,omitempty"`
	ChannelMembers      []ChannelMember      `gorm:"foreignKey:UserID" json:"channel_members,omitempty"`
	Messages            []Message            `gorm:"foreignKey:UserID" json:"messages,omitempty"`
	Tasks               []Task               `gorm:"foreignKey:AssigneeID" json:"tasks,omitempty"`
	EventParticipants   []EventParticipant   `gorm:"foreignKey:UserID" json:"event_participants,omitempty"`
}

// TableName テーブル名を指定
func (User) TableName() string {
	return "users"
}

package models

import (
	"time"

	"gorm.io/gorm"
)

// Channel チャンネルモデル
type Channel struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	EventID     uint           `gorm:"not null;index" json:"event_id"`
	Name        string         `gorm:"not null" json:"name"` // 例: #general
	Description *string        `json:"description,omitempty"`
	IsPrivate   bool           `gorm:"default:false" json:"is_private"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event          Event           `gorm:"foreignKey:EventID" json:"event,omitempty"`
	ChannelMembers []ChannelMember `json:"channel_members,omitempty"`
	Messages       []Message       `json:"messages,omitempty"`
}

// TableName テーブル名を指定
func (Channel) TableName() string {
	return "channels"
}

// ChannelMember チャンネルメンバーモデル
type ChannelMember struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ChannelID   uint           `gorm:"not null;index" json:"channel_id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	JoinedAt    time.Time      `gorm:"default:CURRENT_TIMESTAMP" json:"joined_at"`
	LastReadAt  *time.Time      `json:"last_read_at,omitempty"` // 既読位置管理用
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Channel Channel `gorm:"foreignKey:ChannelID" json:"channel,omitempty"`
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName テーブル名を指定
func (ChannelMember) TableName() string {
	return "channel_members"
}

// Message メッセージモデル
type Message struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	ChannelID      uint           `gorm:"not null;index" json:"channel_id"`
	UserID         uint           `gorm:"not null;index" json:"user_id"`
	Content        string         `gorm:"type:text;not null" json:"content"`
	ParentMessageID *uint          `gorm:"index" json:"parent_message_id,omitempty"` // スレッドの親ID
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	IsDeleted      bool           `gorm:"default:false" json:"is_deleted"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Channel        Channel  `gorm:"foreignKey:ChannelID" json:"channel,omitempty"`
	User           User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ParentMessage  *Message `gorm:"foreignKey:ParentMessageID" json:"parent_message,omitempty"`
	Replies        []Message `gorm:"foreignKey:ParentMessageID" json:"replies,omitempty"`
}

// TableName テーブル名を指定
func (Message) TableName() string {
	return "messages"
}

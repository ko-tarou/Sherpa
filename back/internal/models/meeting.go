package models

import (
	"time"

	"gorm.io/gorm"
)

// Meeting 会議モデル
type Meeting struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	EventID   uint           `gorm:"not null;index" json:"event_id"`
	Title     string         `gorm:"not null" json:"title"`
	StartAt   time.Time      `gorm:"not null" json:"start_at"`
	Minutes   *string        `gorm:"type:text" json:"minutes,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Event Event `gorm:"foreignKey:EventID" json:"event,omitempty"`
}

// TableName テーブル名を指定
func (Meeting) TableName() string {
	return "meetings"
}

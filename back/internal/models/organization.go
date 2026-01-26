package models

import (
	"time"

	"gorm.io/gorm"
)

// Organization 組織モデル
type Organization struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Description *string        `json:"description,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Members []OrganizationMember `json:"members,omitempty"`
	Events  []Event             `json:"events,omitempty"`
}

// TableName テーブル名を指定
func (Organization) TableName() string {
	return "organizations"
}

// OrganizationMember 組織メンバーモデル
type OrganizationMember struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"not null;index" json:"user_id"`
	OrganizationID uint           `gorm:"not null;index" json:"organization_id"`
	Role           string         `gorm:"not null" json:"role"` // admin, member, etc.
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User         User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
}

// TableName テーブル名を指定
func (OrganizationMember) TableName() string {
	return "organization_members"
}

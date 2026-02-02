package models

// TaskAssignee タスクと担当者の多対多
type TaskAssignee struct {
	TaskID uint `gorm:"primaryKey" json:"task_id"`
	UserID uint `gorm:"primaryKey" json:"user_id"`

	Task Task `gorm:"foreignKey:TaskID" json:"-"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (TaskAssignee) TableName() string {
	return "task_assignees"
}

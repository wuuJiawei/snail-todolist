package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type TaskActivityAction string

const (
	ActionTaskCreated        TaskActivityAction = "task_created"
	ActionTitleUpdated       TaskActivityAction = "title_updated"
	ActionDescriptionUpdated TaskActivityAction = "description_updated"
	ActionStatusUpdated      TaskActivityAction = "status_updated"
	ActionDueDateUpdated     TaskActivityAction = "due_date_updated"
	ActionProjectChanged     TaskActivityAction = "project_changed"
	ActionAttachmentsUpdated TaskActivityAction = "attachments_updated"
	ActionTagAdded           TaskActivityAction = "tag_added"
	ActionTagRemoved         TaskActivityAction = "tag_removed"
	ActionMovedToTrash       TaskActivityAction = "task_moved_to_trash"
	ActionRestored           TaskActivityAction = "task_restored"
	ActionAbandoned          TaskActivityAction = "task_abandoned"
	ActionReactivated        TaskActivityAction = "task_reactivated"
)

type TaskActivity struct {
	ID        uuid.UUID          `gorm:"type:uuid;primaryKey" json:"id"`
	TaskID    uuid.UUID          `gorm:"type:uuid;index;not null" json:"task_id"`
	UserID    *uuid.UUID         `gorm:"type:uuid;index" json:"user_id"`
	Action    TaskActivityAction `gorm:"size:50;not null" json:"action"`
	Metadata  datatypes.JSON     `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt time.Time          `json:"created_at"`

	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (a *TaskActivity) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

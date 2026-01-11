package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tag struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string     `gorm:"size:100;not null" json:"name"`
	UserID    uuid.UUID  `gorm:"type:uuid;index;not null" json:"user_id"`
	ProjectID *uuid.UUID `gorm:"type:uuid;index" json:"project_id"`
	CreatedAt time.Time  `json:"created_at"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

type TaskTag struct {
	TaskID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"task_id"`
	TagID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
	CreatedAt time.Time `json:"created_at"`

	Tag  *Tag  `gorm:"foreignKey:TagID" json:"tag,omitempty"`
	Task *Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
}

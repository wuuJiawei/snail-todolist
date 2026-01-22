package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PomodoroSessionType string

const (
	PomodoroFocus      PomodoroSessionType = "focus"
	PomodoroShortBreak PomodoroSessionType = "short_break"
	PomodoroLongBreak  PomodoroSessionType = "long_break"
)

type PomodoroSession struct {
	ID        uuid.UUID           `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID           `gorm:"type:uuid;index;not null" json:"user_id"`
	StartTime time.Time           `gorm:"not null" json:"start_time"`
	EndTime   *time.Time          `json:"end_time"`
	Duration  int                 `gorm:"not null" json:"duration"`
	Type      PomodoroSessionType `gorm:"size:20;not null" json:"type"`
	Completed bool                `gorm:"default:false" json:"completed"`
	Title     *string             `gorm:"size:200" json:"title"`
	CreatedAt time.Time           `json:"created_at"`
}

func (p *PomodoroSession) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

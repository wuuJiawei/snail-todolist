package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CheckInRecord struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID      uuid.UUID  `gorm:"type:uuid;index;not null" json:"user_id"`
	CheckInTime time.Time  `gorm:"not null;index" json:"check_in_time"`
	Note        *string    `gorm:"type:text" json:"note"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (c *CheckInRecord) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

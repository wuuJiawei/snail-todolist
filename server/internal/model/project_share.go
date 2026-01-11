package model

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProjectShare struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProjectID uuid.UUID `gorm:"type:uuid;index;not null" json:"project_id"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
	ShareCode string    `gorm:"size:8;uniqueIndex;not null" json:"share_code"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`

	Project *List `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

func (p *ProjectShare) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.ShareCode == "" {
		p.ShareCode = generateShareCode()
	}
	return nil
}

func generateShareCode() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

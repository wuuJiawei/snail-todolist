package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MemberRole string

const (
	RoleOwner  MemberRole = "owner"
	RoleEditor MemberRole = "editor"
	RoleViewer MemberRole = "viewer"
)

type ListMember struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ListID     uuid.UUID      `gorm:"type:uuid;index;not null" json:"list_id"`
	UserID     uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	Role       MemberRole     `gorm:"size:20;default:viewer" json:"role"`
	InvitedBy  uuid.UUID      `gorm:"type:uuid" json:"invited_by"`
	InvitedAt  time.Time      `json:"invited_at"`
	AcceptedAt *time.Time     `json:"accepted_at"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	List *List `gorm:"foreignKey:ListID" json:"list,omitempty"`
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (m *ListMember) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.InvitedAt.IsZero() {
		m.InvitedAt = time.Now()
	}
	return nil
}

// CanEdit 检查是否有编辑权限
func (m *ListMember) CanEdit() bool {
	return m.Role == RoleOwner || m.Role == RoleEditor
}

// CanDelete 检查是否有删除权限
func (m *ListMember) CanDelete() bool {
	return m.Role == RoleOwner
}

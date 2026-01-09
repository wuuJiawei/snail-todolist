package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TaskStatus string

const (
	TaskStatusTodo  TaskStatus = "todo"
	TaskStatusDoing TaskStatus = "doing"
	TaskStatusDone  TaskStatus = "done"
)

type Task struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ListID      uuid.UUID      `gorm:"type:uuid;index;not null" json:"list_id"`
	UserID      uuid.UUID      `gorm:"type:uuid;index;not null" json:"user_id"`
	Title       string         `gorm:"size:500;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Status      TaskStatus     `gorm:"size:20;default:todo;index" json:"status"`
	Priority    int            `gorm:"default:0" json:"priority"`
	DueDate     *time.Time     `gorm:"index" json:"due_date"`
	Tags        StringArray    `gorm:"type:text[]" json:"tags"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// 关联
	List *List `gorm:"foreignKey:ListID" json:"list,omitempty"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	if t.Status == "" {
		t.Status = TaskStatusTodo
	}
	return nil
}

// StringArray 用于 PostgreSQL text[] 类型
type StringArray []string

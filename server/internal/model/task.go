package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type TaskStatus string

const (
	TaskStatusTodo  TaskStatus = "todo"
	TaskStatusDoing TaskStatus = "doing"
	TaskStatusDone  TaskStatus = "done"
)

type Task struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ListID      uuid.UUID `gorm:"type:uuid;index;not null" json:"list_id"`
	UserID      uuid.UUID `gorm:"type:uuid;index;not null" json:"user_id"`
	Title       string    `gorm:"size:500;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      TaskStatus `gorm:"size:20;default:todo;index" json:"status"`
	Priority    int       `gorm:"default:0" json:"priority"`
	DueDate     *time.Time `gorm:"index" json:"due_date"`
	SortOrder   int       `gorm:"default:0" json:"sort_order"`

	// 完成状态
	Completed   bool       `gorm:"default:false" json:"completed"`
	CompletedAt *time.Time `json:"completed_at"`

	// 软删除（自定义，非 GORM 内置）
	Deleted   bool       `gorm:"default:false;index" json:"deleted"`
	DeletedAt *time.Time `json:"deleted_at"`

	// 放弃状态
	Abandoned   bool       `gorm:"default:false" json:"abandoned"`
	AbandonedAt *time.Time `json:"abandoned_at"`

	// 标记
	Flagged bool `gorm:"default:false;index" json:"flagged"`

	// 图标
	Icon string `gorm:"size:50" json:"icon"`

	// 附件（JSONB）
	Attachments datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"attachments"`

	// 时间戳
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

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

// TaskAttachment 附件结构
type TaskAttachment struct {
	ID           string    `json:"id"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	Type         string    `json:"type"`
	UploadedAt   time.Time `json:"uploaded_at"`
}

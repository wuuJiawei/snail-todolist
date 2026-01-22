package service

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type MigrationService struct {
	db           *gorm.DB
	listRepo     *repository.ListRepository
	taskRepo     *repository.TaskRepository
	tagRepo      *repository.TagRepository
	taskTagRepo  *repository.TaskTagRepository
	pomodoroRepo *repository.PomodoroRepository
	activityRepo *repository.TaskActivityRepository
}

func NewMigrationService(
	db *gorm.DB,
	listRepo *repository.ListRepository,
	taskRepo *repository.TaskRepository,
	tagRepo *repository.TagRepository,
	taskTagRepo *repository.TaskTagRepository,
	pomodoroRepo *repository.PomodoroRepository,
	activityRepo *repository.TaskActivityRepository,
) *MigrationService {
	return &MigrationService{
		db:           db,
		listRepo:     listRepo,
		taskRepo:     taskRepo,
		tagRepo:      tagRepo,
		taskTagRepo:  taskTagRepo,
		pomodoroRepo: pomodoroRepo,
		activityRepo: activityRepo,
	}
}

// ExportData 导出数据结构
type ExportData struct {
	ExportedAt       time.Time               `json:"exported_at"`
	Version          string                  `json:"version"`
	Lists            []model.List            `json:"lists"`
	Tasks            []model.Task            `json:"tasks"`
	Tags             []model.Tag             `json:"tags"`
	TaskTags         []model.TaskTag         `json:"task_tags"`
	PomodoroSessions []model.PomodoroSession `json:"pomodoro_sessions"`
	TaskActivities   []model.TaskActivity    `json:"task_activities"`
}

// ImportDataInput 导入数据输入
type ImportDataInput struct {
	Lists            []ImportList            `json:"lists"`
	Tasks            []ImportTask            `json:"tasks"`
	Tags             []ImportTag             `json:"tags"`
	TaskTags         []ImportTaskTag         `json:"task_tags"`
	PomodoroSessions []ImportPomodoroSession `json:"pomodoro_sessions"`
}

type ImportList struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	Color     string `json:"color"`
	ViewType  string `json:"view_type"`
	SortOrder int    `json:"sort_order"`
}

type ImportTask struct {
	ID          string                 `json:"id"`
	ListID      string                 `json:"list_id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Status      string                 `json:"status"`
	DueDate     *string                `json:"due_date"`
	Completed   bool                   `json:"completed"`
	CompletedAt *string                `json:"completed_at"`
	Flagged     bool                   `json:"flagged"`
	Icon        string                 `json:"icon"`
	SortOrder   int                    `json:"sort_order"`
	Deleted     bool                   `json:"deleted"`
	DeletedAt   *string                `json:"deleted_at"`
	Abandoned   bool                   `json:"abandoned"`
	AbandonedAt *string                `json:"abandoned_at"`
	Attachments []model.TaskAttachment `json:"attachments"`
}

type ImportTag struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ProjectID *string `json:"project_id"`
}

type ImportTaskTag struct {
	TaskID string `json:"task_id"`
	TagID  string `json:"tag_id"`
}

type ImportPomodoroSession struct {
	ID          string  `json:"id"`
	TaskID      *string `json:"task_id"`
	Duration    int     `json:"duration"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	StartedAt   string  `json:"started_at"`
	CompletedAt *string `json:"completed_at"`
	Notes       string  `json:"notes"`
}

// ImportResult 导入结果
type ImportResult struct {
	ListsImported     int               `json:"lists_imported"`
	TasksImported     int               `json:"tasks_imported"`
	TagsImported      int               `json:"tags_imported"`
	TaskTagsImported  int               `json:"task_tags_imported"`
	PomodorosImported int               `json:"pomodoros_imported"`
	IDMapping         map[string]string `json:"id_mapping"`
}

// parseTimePtr tries multiple layouts commonly used by the web client/offline backup.
// Returns nil when parsing fails to keep import best-effort.
func parseTimePtr(value *string) *time.Time {
	if value == nil {
		return nil
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, *value); err == nil {
			return &parsed
		}
	}

	return nil
}

// ExportUserData 导出用户全部数据
func (s *MigrationService) ExportUserData(userID uuid.UUID) (*ExportData, error) {
	lists, err := s.listRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	tasks, err := s.taskRepo.FindAllByUserID(userID)
	if err != nil {
		return nil, err
	}

	tags, err := s.tagRepo.FindByUser(userID)
	if err != nil {
		return nil, err
	}

	taskIDs := make([]uuid.UUID, len(tasks))
	for i, t := range tasks {
		taskIDs[i] = t.ID
	}

	var taskTags []model.TaskTag
	if len(taskIDs) > 0 {
		s.db.Where("task_id IN ?", taskIDs).Find(&taskTags)
	}

	sessions, _, err := s.pomodoroRepo.FindByUser(userID, nil, nil, 10000, 0)
	if err != nil {
		sessions = []model.PomodoroSession{}
	}

	var activities []model.TaskActivity
	if len(taskIDs) > 0 {
		s.db.Where("task_id IN ?", taskIDs).Order("created_at DESC").Limit(10000).Find(&activities)
	}

	return &ExportData{
		ExportedAt:       time.Now(),
		Version:          "1.0",
		Lists:            lists,
		Tasks:            tasks,
		Tags:             tags,
		TaskTags:         taskTags,
		PomodoroSessions: sessions,
		TaskActivities:   activities,
	}, nil
}

// ImportUserData 导入用户数据
// replaceExisting: true 时会在导入前清空用户的现有数据，用于离线/旧版本迁移
func (s *MigrationService) ImportUserData(userID uuid.UUID, input *ImportDataInput, replaceExisting bool) (*ImportResult, error) {
	result := &ImportResult{
		IDMapping: make(map[string]string),
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 清空现有数据（可选）
		if replaceExisting {
			if err := s.deleteUserData(tx, userID); err != nil {
				return err
			}
		}

		listIDMap := make(map[string]uuid.UUID)
		for _, l := range input.Lists {
			newID := uuid.New()
			list := &model.List{
				ID:        newID,
				UserID:    userID,
				Name:      l.Name,
				Icon:      l.Icon,
				Color:     l.Color,
				SortOrder: l.SortOrder,
			}
			if err := tx.Create(list).Error; err != nil {
				return err
			}
			listIDMap[l.ID] = newID
			result.IDMapping[l.ID] = newID.String()
			result.ListsImported++
		}

		tagIDMap := make(map[string]uuid.UUID)
		for _, t := range input.Tags {
			newID := uuid.New()
			tag := &model.Tag{
				ID:     newID,
				UserID: userID,
				Name:   t.Name,
			}
			if t.ProjectID != nil {
				if mappedID, ok := listIDMap[*t.ProjectID]; ok {
					tag.ProjectID = &mappedID
				}
			}
			if err := tx.Create(tag).Error; err != nil {
				return err
			}
			tagIDMap[t.ID] = newID
			result.IDMapping[t.ID] = newID.String()
			result.TagsImported++
		}

		taskIDMap := make(map[string]uuid.UUID)
		for _, t := range input.Tasks {
			newID := uuid.New()
			listID, ok := listIDMap[t.ListID]
			if !ok {
				continue
			}

			// 默认状态：兼容旧备份文件未显式提供 status
			status := model.TaskStatus(t.Status)
			if status == "" {
				if t.Completed {
					status = model.TaskStatusDone
				} else {
					status = model.TaskStatusTodo
				}
			}

			task := &model.Task{
				ID:          newID,
				ListID:      listID,
				UserID:      userID,
				Title:       t.Title,
				Description: t.Description,
				Status:      status,
				Completed:   t.Completed,
				Flagged:     t.Flagged,
				Icon:        t.Icon,
				SortOrder:   t.SortOrder,
				Deleted:     t.Deleted,
				Abandoned:   t.Abandoned,
			}

			task.DueDate = parseTimePtr(t.DueDate)
			task.CompletedAt = parseTimePtr(t.CompletedAt)
			task.DeletedAt = parseTimePtr(t.DeletedAt)
			task.AbandonedAt = parseTimePtr(t.AbandonedAt)

			if len(t.Attachments) > 0 {
				if data, err := json.Marshal(t.Attachments); err == nil {
					task.Attachments = datatypes.JSON(data)
				}
			}

			if err := tx.Create(task).Error; err != nil {
				return err
			}
			taskIDMap[t.ID] = newID
			result.IDMapping[t.ID] = newID.String()
			result.TasksImported++
		}

		for _, tt := range input.TaskTags {
			taskID, taskOK := taskIDMap[tt.TaskID]
			tagID, tagOK := tagIDMap[tt.TagID]
			if !taskOK || !tagOK {
				continue
			}

			taskTag := &model.TaskTag{
				TaskID:    taskID,
				TagID:     tagID,
				CreatedAt: time.Now(),
			}
			if err := tx.Create(taskTag).Error; err != nil {
				continue
			}
			result.TaskTagsImported++
		}

		for _, p := range input.PomodoroSessions {
			newID := uuid.New()
			session := &model.PomodoroSession{
				ID:       newID,
				UserID:   userID,
				Duration: p.Duration,
				Type:     model.PomodoroSessionType(p.Type),
			}

			if parsed := parseTimePtr(&p.StartedAt); parsed != nil {
				session.StartTime = *parsed
			} else {
				session.StartTime = time.Now()
			}
			if parsed := parseTimePtr(p.CompletedAt); parsed != nil {
				session.EndTime = parsed
				session.Completed = true
			}

			if err := tx.Create(session).Error; err != nil {
				continue
			}
			result.IDMapping[p.ID] = newID.String()
			result.PomodorosImported++
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

// deleteUserData 删除用户相关的任务/清单/标签/番茄钟/活动数据
func (s *MigrationService) deleteUserData(tx *gorm.DB, userID uuid.UUID) error {
	// 任务活动
	if err := tx.Where("user_id = ?", userID).Delete(&model.TaskActivity{}).Error; err != nil {
		return err
	}
	// 任务标签关联
	if err := tx.Where("task_id in (select id from tasks where user_id = ?)", userID).Delete(&model.TaskTag{}).Error; err != nil {
		return err
	}
	// 任务
	if err := tx.Where("user_id = ?", userID).Delete(&model.Task{}).Error; err != nil {
		return err
	}
	// 标签
	if err := tx.Where("user_id = ?", userID).Delete(&model.Tag{}).Error; err != nil {
		return err
	}
	// 清单
	if err := tx.Where("user_id = ?", userID).Delete(&model.List{}).Error; err != nil {
		return err
	}
	// 番茄钟
	if err := tx.Where("user_id = ?", userID).Delete(&model.PomodoroSession{}).Error; err != nil {
		return err
	}
	return nil
}

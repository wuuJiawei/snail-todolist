package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type TaskTagRepository struct {
	db *gorm.DB
}

func NewTaskTagRepository(db *gorm.DB) *TaskTagRepository {
	return &TaskTagRepository{db: db}
}

func (r *TaskTagRepository) Attach(taskID, tagID uuid.UUID) error {
	taskTag := &model.TaskTag{
		TaskID:    taskID,
		TagID:     tagID,
		CreatedAt: time.Now(),
	}
	return r.db.Create(taskTag).Error
}

func (r *TaskTagRepository) Detach(taskID, tagID uuid.UUID) error {
	return r.db.Delete(&model.TaskTag{}, "task_id = ? AND tag_id = ?", taskID, tagID).Error
}

func (r *TaskTagRepository) GetTagsByTask(taskID uuid.UUID) ([]model.Tag, error) {
	var tags []model.Tag
	err := r.db.Table("tags").
		Joins("INNER JOIN task_tags ON task_tags.tag_id = tags.id").
		Where("task_tags.task_id = ?", taskID).
		Order("tags.name ASC").
		Find(&tags).Error
	return tags, err
}

func (r *TaskTagRepository) GetTasksByTag(tagID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.Table("tasks").
		Joins("INNER JOIN task_tags ON task_tags.task_id = tasks.id").
		Where("task_tags.tag_id = ? AND tasks.deleted = false", tagID).
		Order("tasks.created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *TaskTagRepository) Exists(taskID, tagID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&model.TaskTag{}).Where("task_id = ? AND tag_id = ?", taskID, tagID).Count(&count).Error
	return count > 0, err
}

// GetTagsByTaskIDs 批量获取多个任务的标签
func (r *TaskTagRepository) GetTagsByTaskIDs(taskIDs []uuid.UUID) (map[uuid.UUID][]model.Tag, error) {
	if len(taskIDs) == 0 {
		return make(map[uuid.UUID][]model.Tag), nil
	}

	type taskTagResult struct {
		TaskID uuid.UUID
		model.Tag
	}

	var results []taskTagResult
	err := r.db.Table("tags").
		Select("task_tags.task_id, tags.*").
		Joins("INNER JOIN task_tags ON task_tags.tag_id = tags.id").
		Where("task_tags.task_id IN ?", taskIDs).
		Order("tags.name ASC").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	tagMap := make(map[uuid.UUID][]model.Tag)
	for _, taskID := range taskIDs {
		tagMap[taskID] = []model.Tag{}
	}
	for _, r := range results {
		tagMap[r.TaskID] = append(tagMap[r.TaskID], r.Tag)
	}

	return tagMap, nil
}

package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type TaskActivityRepository struct {
	db *gorm.DB
}

func NewTaskActivityRepository(db *gorm.DB) *TaskActivityRepository {
	return &TaskActivityRepository{db: db}
}

func (r *TaskActivityRepository) Create(activity *model.TaskActivity) error {
	return r.db.Create(activity).Error
}

func (r *TaskActivityRepository) FindByTask(taskID uuid.UUID, limit, offset int) ([]model.TaskActivity, int64, error) {
	var activities []model.TaskActivity
	var total int64

	r.db.Model(&model.TaskActivity{}).Where("task_id = ?", taskID).Count(&total)

	err := r.db.Preload("User").
		Where("task_id = ?", taskID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&activities).Error

	return activities, total, err
}

func (r *TaskActivityRepository) FindByUser(userID uuid.UUID, limit, offset int) ([]model.TaskActivity, int64, error) {
	var activities []model.TaskActivity
	var total int64

	r.db.Model(&model.TaskActivity{}).Where("user_id = ?", userID).Count(&total)

	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&activities).Error

	return activities, total, err
}

func (r *TaskActivityRepository) DeleteByTask(taskID uuid.UUID) error {
	return r.db.Delete(&model.TaskActivity{}, "task_id = ?", taskID).Error
}

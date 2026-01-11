package service

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type TaskActivityService struct {
	activityRepo *repository.TaskActivityRepository
	taskRepo     *repository.TaskRepository
}

func NewTaskActivityService(activityRepo *repository.TaskActivityRepository, taskRepo *repository.TaskRepository) *TaskActivityService {
	return &TaskActivityService{
		activityRepo: activityRepo,
		taskRepo:     taskRepo,
	}
}

type ActivityListResponse struct {
	Activities []model.TaskActivity `json:"activities"`
	Total      int64                `json:"total"`
	Page       int                  `json:"page"`
	Limit      int                  `json:"limit"`
}

func (s *TaskActivityService) GetTaskActivities(userID, taskID uuid.UUID, page, limit int) (*ActivityListResponse, error) {
	task, err := s.taskRepo.FindByIDIncludeDeleted(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权访问此任务")
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	activities, total, err := s.activityRepo.FindByTask(taskID, limit, offset)
	if err != nil {
		return nil, err
	}

	return &ActivityListResponse{
		Activities: activities,
		Total:      total,
		Page:       page,
		Limit:      limit,
	}, nil
}

func (s *TaskActivityService) RecordActivity(taskID uuid.UUID, userID *uuid.UUID, action model.TaskActivityAction, metadata map[string]interface{}) error {
	metadataJSON, _ := json.Marshal(metadata)

	activity := &model.TaskActivity{
		TaskID:    taskID,
		UserID:    userID,
		Action:    action,
		Metadata:  datatypes.JSON(metadataJSON),
		CreatedAt: time.Now(),
	}

	return s.activityRepo.Create(activity)
}

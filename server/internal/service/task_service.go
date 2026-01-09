package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type TaskService struct {
	taskRepo *repository.TaskRepository
	listRepo *repository.ListRepository
}

func NewTaskService(taskRepo *repository.TaskRepository, listRepo *repository.ListRepository) *TaskService {
	return &TaskService{
		taskRepo: taskRepo,
		listRepo: listRepo,
	}
}

type CreateTaskInput struct {
	Title       string     `json:"title" binding:"required,max=500"`
	Description string     `json:"description"`
	Priority    int        `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	Tags        []string   `json:"tags"`
}

type UpdateTaskInput struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Priority    *int       `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	Tags        []string   `json:"tags"`
	SortOrder   *int       `json:"sort_order"`
}

type UpdateStatusInput struct {
	Status model.TaskStatus `json:"status" binding:"required,oneof=todo doing done"`
}

type TaskListResponse struct {
	Tasks []model.Task `json:"tasks"`
	Total int64        `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}

func (s *TaskService) CreateTask(userID, listID uuid.UUID, input *CreateTaskInput) (*model.Task, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, errors.New("清单不存在")
	}
	if list.UserID != userID {
		return nil, errors.New("无权操作此清单")
	}

	task := &model.Task{
		ListID:      listID,
		UserID:      userID,
		Title:       input.Title,
		Description: input.Description,
		Priority:    input.Priority,
		DueDate:     input.DueDate,
		Tags:        input.Tags,
		Status:      model.TaskStatusTodo,
	}

	if err := s.taskRepo.Create(task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TaskService) GetTask(userID, taskID uuid.UUID) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权访问此任务")
	}
	return task, nil
}

func (s *TaskService) GetTasksByList(userID, listID uuid.UUID, status string, page, limit int) (*TaskListResponse, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, errors.New("清单不存在")
	}
	if list.UserID != userID {
		return nil, errors.New("无权访问此清单")
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	tasks, total, err := s.taskRepo.FindByListID(listID, status, limit, offset)
	if err != nil {
		return nil, err
	}

	return &TaskListResponse{
		Tasks: tasks,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *TaskService) UpdateTask(userID, taskID uuid.UUID, input *UpdateTaskInput) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}

	if input.Title != nil {
		task.Title = *input.Title
	}
	if input.Description != nil {
		task.Description = *input.Description
	}
	if input.Priority != nil {
		task.Priority = *input.Priority
	}
	if input.DueDate != nil {
		task.DueDate = input.DueDate
	}
	if input.Tags != nil {
		task.Tags = input.Tags
	}
	if input.SortOrder != nil {
		task.SortOrder = *input.SortOrder
	}

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TaskService) UpdateStatus(userID, taskID uuid.UUID, status model.TaskStatus) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}

	task.Status = status
	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *TaskService) DeleteTask(userID, taskID uuid.UUID) error {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return errors.New("任务不存在")
	}
	if task.UserID != userID {
		return errors.New("无权操作此任务")
	}

	return s.taskRepo.Delete(taskID)
}

func (s *TaskService) GetTodayTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetTodayTasks(userID)
}

func (s *TaskService) GetUpcomingTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetUpcomingTasks(userID, 7)
}

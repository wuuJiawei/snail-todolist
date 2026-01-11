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
	Icon        string     `json:"icon"`
}

type UpdateTaskInput struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Priority    *int       `json:"priority"`
	DueDate     *time.Time `json:"due_date"`
	SortOrder   *int       `json:"sort_order"`
	Icon        *string    `json:"icon"`
	Flagged     *bool      `json:"flagged"`
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
		Icon:        input.Icon,
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
	if input.SortOrder != nil {
		task.SortOrder = *input.SortOrder
	}
	if input.Icon != nil {
		task.Icon = *input.Icon
	}
	if input.Flagged != nil {
		task.Flagged = *input.Flagged
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

	// 同步 completed 状态
	if status == model.TaskStatusDone {
		task.Completed = true
		now := time.Now()
		task.CompletedAt = &now
	} else {
		task.Completed = false
		task.CompletedAt = nil
	}

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

	// 软删除
	return s.taskRepo.SoftDelete(taskID)
}

// RestoreTask 恢复任务（从回收站）
func (s *TaskService) RestoreTask(userID, taskID uuid.UUID) (*model.Task, error) {
	task, err := s.taskRepo.FindByIDIncludeDeleted(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}
	if !task.Deleted {
		return nil, errors.New("任务不在回收站中")
	}

	if err := s.taskRepo.Restore(taskID); err != nil {
		return nil, err
	}

	task.Deleted = false
	task.DeletedAt = nil
	return task, nil
}

// PermanentDeleteTask 永久删除任务
func (s *TaskService) PermanentDeleteTask(userID, taskID uuid.UUID) error {
	task, err := s.taskRepo.FindByIDIncludeDeleted(taskID)
	if err != nil {
		return errors.New("任务不存在")
	}
	if task.UserID != userID {
		return errors.New("无权操作此任务")
	}

	return s.taskRepo.Delete(taskID)
}

// GetTrashTasks 获取回收站任务
func (s *TaskService) GetTrashTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetTrashTasks(userID)
}

// AbandonTask 放弃任务
func (s *TaskService) AbandonTask(userID, taskID uuid.UUID) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}

	if err := s.taskRepo.SetAbandoned(taskID, true); err != nil {
		return nil, err
	}

	task.Abandoned = true
	now := time.Now()
	task.AbandonedAt = &now
	return task, nil
}

// ReactivateTask 重新激活任务
func (s *TaskService) ReactivateTask(userID, taskID uuid.UUID) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}

	if err := s.taskRepo.SetAbandoned(taskID, false); err != nil {
		return nil, err
	}

	task.Abandoned = false
	task.AbandonedAt = nil
	return task, nil
}

// ToggleFlag 切换任务标记状态
func (s *TaskService) ToggleFlag(userID, taskID uuid.UUID) (*model.Task, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权操作此任务")
	}

	newFlagged := !task.Flagged
	if err := s.taskRepo.SetFlagged(taskID, newFlagged); err != nil {
		return nil, err
	}

	task.Flagged = newFlagged
	return task, nil
}

// GetFlaggedTasks 获取标记的任务
func (s *TaskService) GetFlaggedTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetFlaggedTasks(userID)
}

func (s *TaskService) GetTodayTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetTodayTasks(userID)
}

func (s *TaskService) GetUpcomingTasks(userID uuid.UUID) ([]model.Task, error) {
	return s.taskRepo.GetUpcomingTasks(userID, 7)
}

// SearchTasks 搜索任务
func (s *TaskService) SearchTasks(userID uuid.UUID, query string, limit int) ([]repository.SearchResult, error) {
	if query == "" {
		return []repository.SearchResult{}, nil
	}
	return s.taskRepo.Search(userID, query, limit)
}

// BatchUpdateStatus 批量更新任务状态
func (s *TaskService) BatchUpdateStatus(userID uuid.UUID, taskIDs []uuid.UUID, status model.TaskStatus) (int64, error) {
	if len(taskIDs) == 0 {
		return 0, nil
	}
	if len(taskIDs) > 100 {
		return 0, errors.New("批量操作最多支持 100 个任务")
	}
	return s.taskRepo.BatchUpdateStatus(userID, taskIDs, status)
}

// BatchDelete 批量删除任务
func (s *TaskService) BatchDelete(userID uuid.UUID, taskIDs []uuid.UUID) (int64, error) {
	if len(taskIDs) == 0 {
		return 0, nil
	}
	if len(taskIDs) > 100 {
		return 0, errors.New("批量操作最多支持 100 个任务")
	}
	return s.taskRepo.BatchDelete(userID, taskIDs)
}

// UpdateSortOrder 更新任务排序
func (s *TaskService) UpdateSortOrder(userID, taskID uuid.UUID, afterID, beforeID *uuid.UUID) error {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return errors.New("任务不存在")
	}
	if task.UserID != userID {
		return errors.New("无权操作此任务")
	}

	afterOrder, beforeOrder, err := s.taskRepo.GetAdjacentSortOrders(task.ListID, afterID, beforeID)
	if err != nil {
		return err
	}

	newOrder := (afterOrder + beforeOrder) / 2
	return s.taskRepo.UpdateSortOrder(taskID, newOrder)
}

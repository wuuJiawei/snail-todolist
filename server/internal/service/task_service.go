package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type TaskService struct {
	taskRepo     *repository.TaskRepository
	listRepo     *repository.ListRepository
	taskTagRepo  *repository.TaskTagRepository
	activityRepo *repository.TaskActivityRepository
	activitySvc  *TaskActivityService
}

func NewTaskService(taskRepo *repository.TaskRepository, listRepo *repository.ListRepository, taskTagRepo *repository.TaskTagRepository, activityRepo *repository.TaskActivityRepository) *TaskService {
	return &TaskService{
		taskRepo:     taskRepo,
		listRepo:     listRepo,
		taskTagRepo:  taskTagRepo,
		activityRepo: activityRepo,
		activitySvc:  NewTaskActivityService(activityRepo, taskRepo),
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

// TaskWithTags 任务及其标签
type TaskWithTags struct {
	model.Task
	Tags []model.Tag `json:"tags"`
}

// TaskListWithTagsResponse 带标签的任务列表响应
type TaskListWithTagsResponse struct {
	Tasks []TaskWithTags `json:"tasks"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}

// TaskDetailResponse 任务详情聚合响应
type TaskDetailResponse struct {
	model.Task
	Tags       []model.Tag          `json:"tags"`
	Activities []model.TaskActivity `json:"activities"`
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

	s.activitySvc.RecordActivity(task.ID, &userID, model.ActionTaskCreated, map[string]interface{}{
		"title": task.Title,
	})

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

// GetTasksByListWithTags 获取清单任务（带标签）- 聚合查询
func (s *TaskService) GetTasksByListWithTags(userID, listID uuid.UUID, status string, page, limit int) (*TaskListWithTagsResponse, error) {
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

	// 批量获取任务标签
	taskIDs := make([]uuid.UUID, len(tasks))
	for i, t := range tasks {
		taskIDs[i] = t.ID
	}

	tagMap, err := s.taskTagRepo.GetTagsByTaskIDs(taskIDs)
	if err != nil {
		return nil, err
	}

	// 组装结果
	tasksWithTags := make([]TaskWithTags, len(tasks))
	for i, t := range tasks {
		tasksWithTags[i] = TaskWithTags{
			Task: t,
			Tags: tagMap[t.ID],
		}
	}

	return &TaskListWithTagsResponse{
		Tasks: tasksWithTags,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// GetTaskDetail 获取任务详情（聚合：任务 + 标签 + 活动记录）
func (s *TaskService) GetTaskDetail(userID, taskID uuid.UUID) (*TaskDetailResponse, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权访问此任务")
	}

	// 获取标签
	tags, err := s.taskTagRepo.GetTagsByTask(taskID)
	if err != nil {
		tags = []model.Tag{}
	}

	// 获取最近活动记录（最多 20 条）
	activities, _, err := s.activityRepo.FindByTask(taskID, 20, 0)
	if err != nil {
		activities = []model.TaskActivity{}
	}

	return &TaskDetailResponse{
		Task:       *task,
		Tags:       tags,
		Activities: activities,
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

	oldTitle := task.Title
	oldDescription := task.Description
	oldDueDate := task.DueDate
	oldFlagged := task.Flagged

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

	if input.Title != nil && *input.Title != oldTitle {
		s.activitySvc.RecordActivity(taskID, &userID, model.ActionTitleUpdated, map[string]interface{}{
			"from": oldTitle,
			"to":   *input.Title,
		})
	}
	if input.Description != nil && *input.Description != oldDescription {
		s.activitySvc.RecordActivity(taskID, &userID, model.ActionDescriptionUpdated, map[string]interface{}{
			"previousLength": len(oldDescription),
			"nextLength":     len(*input.Description),
		})
	}
	if input.DueDate != nil {
		var oldDateStr, newDateStr interface{}
		if oldDueDate != nil {
			oldDateStr = oldDueDate.Format(time.RFC3339)
		}
		newDateStr = input.DueDate.Format(time.RFC3339)
		s.activitySvc.RecordActivity(taskID, &userID, model.ActionDueDateUpdated, map[string]interface{}{
			"from": oldDateStr,
			"to":   newDateStr,
		})
	}
	if input.Flagged != nil && *input.Flagged != oldFlagged {
		action := "task_flagged"
		if !*input.Flagged {
			action = "task_unflagged"
		}
		s.activitySvc.RecordActivity(taskID, &userID, model.TaskActivityAction(action), map[string]interface{}{
			"flagged": *input.Flagged,
		})
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

	oldCompleted := task.Completed
	task.Status = status

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

	if task.Completed != oldCompleted {
		fromStatus := "active"
		toStatus := "completed"
		if !task.Completed {
			fromStatus = "completed"
			toStatus = "active"
		}
		s.activitySvc.RecordActivity(taskID, &userID, model.ActionStatusUpdated, map[string]interface{}{
			"from": fromStatus,
			"to":   toStatus,
		})
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

	if err := s.taskRepo.SoftDelete(taskID); err != nil {
		return err
	}

	s.activitySvc.RecordActivity(taskID, &userID, model.ActionMovedToTrash, nil)
	return nil
}

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

	s.activitySvc.RecordActivity(taskID, &userID, model.ActionRestored, nil)

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

	s.activitySvc.RecordActivity(taskID, &userID, model.ActionAbandoned, nil)

	task.Abandoned = true
	now := time.Now()
	task.AbandonedAt = &now
	return task, nil
}

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

	s.activitySvc.RecordActivity(taskID, &userID, model.ActionReactivated, nil)

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

// GetAllActiveTasks 获取用户所有活跃任务（带标签）
func (s *TaskService) GetAllActiveTasks(userID uuid.UUID) ([]TaskWithTags, error) {
	tasks, err := s.taskRepo.GetAllActiveTasks(userID)
	if err != nil {
		return nil, err
	}

	if len(tasks) == 0 {
		return []TaskWithTags{}, nil
	}

	// 批量获取任务标签
	taskIDs := make([]uuid.UUID, len(tasks))
	for i, t := range tasks {
		taskIDs[i] = t.ID
	}

	tagMap, err := s.taskTagRepo.GetTagsByTaskIDs(taskIDs)
	if err != nil {
		return nil, err
	}

	// 组装结果
	result := make([]TaskWithTags, len(tasks))
	for i, t := range tasks {
		tags := tagMap[t.ID]
		if tags == nil {
			tags = []model.Tag{}
		}
		result[i] = TaskWithTags{
			Task: t,
			Tags: tags,
		}
	}

	return result, nil
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

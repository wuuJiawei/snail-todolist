package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type TaskHandler struct {
	taskService *service.TaskService
}

func NewTaskHandler(taskService *service.TaskService) *TaskHandler {
	return &TaskHandler{taskService: taskService}
}

// CreateTask 创建任务
func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	var input service.CreateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	task, err := h.taskService.CreateTask(userID, listID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, task)
}

// GetTask 获取任务详情
func (h *TaskHandler) GetTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	task, err := h.taskService.GetTask(userID, taskID)
	if err != nil {
		model.Error(c, model.CodeNotFound, err.Error())
		return
	}

	model.Success(c, task)
}

// GetTasksByList 获取清单下的任务
func (h *TaskHandler) GetTasksByList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.taskService.GetTasksByList(userID, listID, status, page, limit)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, result)
}

// UpdateTask 更新任务
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	var input service.UpdateTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	task, err := h.taskService.UpdateTask(userID, taskID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, task)
}

// UpdateStatus 更新任务状态
func (h *TaskHandler) UpdateStatus(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	var input service.UpdateStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	task, err := h.taskService.UpdateStatus(userID, taskID, input.Status)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, task)
}

// DeleteTask 删除任务
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	if err := h.taskService.DeleteTask(userID, taskID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "删除成功"})
}

// GetTodayTasks 获取今日任务
func (h *TaskHandler) GetTodayTasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	tasks, err := h.taskService.GetTodayTasks(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, tasks)
}

// GetUpcomingTasks 获取即将到期任务
func (h *TaskHandler) GetUpcomingTasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	tasks, err := h.taskService.GetUpcomingTasks(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, tasks)
}

// SearchTasks 搜索任务
func (h *TaskHandler) SearchTasks(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if query == "" {
		model.Error(c, model.CodeParamError, "搜索关键词不能为空")
		return
	}

	results, err := h.taskService.SearchTasks(userID, query, limit)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, results)
}

// BatchStatusInput 批量更新状态请求
type BatchStatusInput struct {
	TaskIDs []uuid.UUID      `json:"task_ids" binding:"required,min=1"`
	Status  model.TaskStatus `json:"status" binding:"required,oneof=todo doing done"`
}

// BatchDeleteInput 批量删除请求
type BatchDeleteInput struct {
	TaskIDs []uuid.UUID `json:"task_ids" binding:"required,min=1"`
}

// BatchUpdateStatus 批量更新任务状态
func (h *TaskHandler) BatchUpdateStatus(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input BatchStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	affected, err := h.taskService.BatchUpdateStatus(userID, input.TaskIDs, input.Status)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"affected": affected})
}

// BatchDelete 批量删除任务
func (h *TaskHandler) BatchDelete(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input BatchDeleteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	affected, err := h.taskService.BatchDelete(userID, input.TaskIDs)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"affected": affected})
}

// SortInput 排序请求
type SortInput struct {
	AfterID  *uuid.UUID `json:"after_id"`
	BeforeID *uuid.UUID `json:"before_id"`
}

// UpdateSortOrder 更新任务排序
func (h *TaskHandler) UpdateSortOrder(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	var input SortInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if input.AfterID == nil && input.BeforeID == nil {
		model.Error(c, model.CodeParamError, "after_id 或 before_id 至少需要一个")
		return
	}

	if err := h.taskService.UpdateSortOrder(userID, taskID, input.AfterID, input.BeforeID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "排序更新成功"})
}

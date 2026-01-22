package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type TaskActivityHandler struct {
	activityService *service.TaskActivityService
}

func NewTaskActivityHandler(activityService *service.TaskActivityService) *TaskActivityHandler {
	return &TaskActivityHandler{activityService: activityService}
}

func (h *TaskActivityHandler) GetTaskActivities(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.activityService.GetTaskActivities(userID, taskID, page, limit)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, result)
}

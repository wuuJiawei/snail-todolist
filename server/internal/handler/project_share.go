package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type ProjectShareHandler struct {
	shareService *service.ProjectShareService
}

func NewProjectShareHandler(shareService *service.ProjectShareService) *ProjectShareHandler {
	return &ProjectShareHandler{shareService: shareService}
}

func (h *ProjectShareHandler) GetOrCreateShare(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的项目ID")
		return
	}

	share, err := h.shareService.GetOrCreateShare(userID, projectID)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, share)
}

func (h *ProjectShareHandler) DeactivateShare(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的项目ID")
		return
	}

	if err := h.shareService.DeactivateShare(userID, projectID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "分享链接已停用"})
}

func (h *ProjectShareHandler) JoinByCode(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.JoinByCodeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	list, err := h.shareService.JoinByCode(userID, input.ShareCode)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, list)
}

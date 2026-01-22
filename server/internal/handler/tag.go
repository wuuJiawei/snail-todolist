package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type TagHandler struct {
	tagService *service.TagService
}

func NewTagHandler(tagService *service.TagService) *TagHandler {
	return &TagHandler{tagService: tagService}
}

func (h *TagHandler) GetTags(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var projectID *uuid.UUID
	if pid := c.Query("project_id"); pid != "" {
		if parsed, err := uuid.Parse(pid); err == nil {
			projectID = &parsed
		}
	}

	tags, err := h.tagService.GetTags(userID, projectID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, tags)
}

func (h *TagHandler) CreateTag(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.CreateTagInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	tag, err := h.tagService.CreateTag(userID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, tag)
}

func (h *TagHandler) UpdateTag(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	tagID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的标签ID")
		return
	}

	var input service.UpdateTagInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	tag, err := h.tagService.UpdateTag(userID, tagID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, tag)
}

func (h *TagHandler) DeleteTag(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	tagID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的标签ID")
		return
	}

	if err := h.tagService.DeleteTag(userID, tagID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "删除成功"})
}

func (h *TagHandler) GetTaskTags(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	tags, err := h.tagService.GetTaskTags(userID, taskID)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, tags)
}

func (h *TagHandler) AttachTag(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}
	tagID, err := uuid.Parse(c.Param("tagId"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的标签ID")
		return
	}

	if err := h.tagService.AttachTagToTask(userID, taskID, tagID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "标签添加成功"})
}

func (h *TagHandler) DetachTag(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}
	tagID, err := uuid.Parse(c.Param("tagId"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的标签ID")
		return
	}

	if err := h.tagService.DetachTagFromTask(userID, taskID, tagID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "标签移除成功"})
}

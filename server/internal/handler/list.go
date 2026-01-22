package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type ListHandler struct {
	listService *service.ListService
}

func NewListHandler(listService *service.ListService) *ListHandler {
	return &ListHandler{listService: listService}
}

func (h *ListHandler) GetLists(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	lists, err := h.listService.GetLists(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, lists)
}

func (h *ListHandler) CreateList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.CreateListInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	list, err := h.listService.CreateList(userID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, list)
}

func (h *ListHandler) UpdateList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	var input service.UpdateListInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	list, err := h.listService.UpdateList(userID, listID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, list)
}

func (h *ListHandler) DeleteList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	if err := h.listService.DeleteList(userID, listID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "删除成功"})
}

// SortInput 排序请求
type ListSortInput struct {
	AfterID  *uuid.UUID `json:"after_id"`
	BeforeID *uuid.UUID `json:"before_id"`
}

// UpdateSortOrder 更新清单排序
func (h *ListHandler) UpdateSortOrder(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	var input ListSortInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if input.AfterID == nil && input.BeforeID == nil {
		model.Error(c, model.CodeParamError, "after_id 或 before_id 至少需要一个")
		return
	}

	if err := h.listService.UpdateSortOrder(userID, listID, input.AfterID, input.BeforeID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "排序更新成功"})
}

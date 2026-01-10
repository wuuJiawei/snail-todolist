package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, lists)
}

func (h *ListHandler) CreateList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.CreateListInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	list, err := h.listService.CreateList(userID, &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, list)
}

func (h *ListHandler) UpdateList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的清单ID"})
		return
	}

	var input service.UpdateListInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	list, err := h.listService.UpdateList(userID, listID, &input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}

func (h *ListHandler) DeleteList(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的清单ID"})
		return
	}

	if err := h.listService.DeleteList(userID, listID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的清单ID"})
		return
	}

	var input ListSortInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.AfterID == nil && input.BeforeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "after_id 或 before_id 至少需要一个"})
		return
	}

	if err := h.listService.UpdateSortOrder(userID, listID, input.AfterID, input.BeforeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "排序更新成功"})
}

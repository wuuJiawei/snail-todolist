package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.userService.GetUser(userID)
	if err != nil {
		model.Error(c, model.CodeNotFound, "用户不存在")
		return
	}

	model.Success(c, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	user, err := h.userService.UpdateUser(userID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, user)
}

func (h *UserHandler) UpdatePassword(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.UpdatePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if err := h.userService.UpdatePassword(userID, &input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "密码修改成功"})
}

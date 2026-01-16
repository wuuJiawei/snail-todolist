package handler

import (
	"github.com/gin-gonic/gin"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input service.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	resp, err := h.authService.Register(&input)
	if err != nil {
		model.Error(c, model.CodeEmailExists, err.Error())
		return
	}

	model.Success(c, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input service.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	resp, err := h.authService.Login(&input)
	if err != nil {
		model.Error(c, model.CodeInvalidCredential, err.Error())
		return
	}

	model.Success(c, resp)
}

func (h *AuthHandler) SendEmailCode(c *gin.Context) {
	var input service.EmailCodeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if err := h.authService.SendEmailCode(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "验证码已发送"})
}

func (h *AuthHandler) EmailLogin(c *gin.Context) {
	var input service.EmailLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	resp, err := h.authService.EmailLogin(&input)
	if err != nil {
		model.Error(c, model.CodeInvalidCredential, err.Error())
		return
	}

	model.Success(c, resp)
}

func (h *AuthHandler) GetAuthConfig(c *gin.Context) {
	resp := h.authService.GetAuthConfig()
	model.Success(c, resp)
}

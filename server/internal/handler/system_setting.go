package handler

import (
	"github.com/gin-gonic/gin"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type SystemSettingHandler struct {
	settingService *service.SystemSettingService
}

func NewSystemSettingHandler(settingService *service.SystemSettingService) *SystemSettingHandler {
	return &SystemSettingHandler{settingService: settingService}
}

func (h *SystemSettingHandler) GetSMTPConfig(c *gin.Context) {
	cfg, err := h.settingService.GetSMTPConfig()
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}
	cfg.Password = ""
	model.Success(c, cfg)
}

func (h *SystemSettingHandler) UpdateSMTPConfig(c *gin.Context) {
	var input service.SMTPConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if err := h.settingService.UpdateSMTPConfig(&input); err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "配置已保存"})
}


func (h *SystemSettingHandler) GetAppInfo(c *gin.Context) {
	cfg := h.settingService.GetAppInfo()
	model.Success(c, cfg)
}

func (h *SystemSettingHandler) UpdateAppInfo(c *gin.Context) {
	var input service.AppInfoConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if err := h.settingService.UpdateAppInfo(&input); err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "配置已保存"})
}

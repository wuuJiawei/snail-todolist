package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type MigrationHandler struct {
	migrationService *service.MigrationService
}

func NewMigrationHandler(migrationService *service.MigrationService) *MigrationHandler {
	return &MigrationHandler{migrationService: migrationService}
}

// Export 导出用户全部数据
func (h *MigrationHandler) Export(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	data, err := h.migrationService.ExportUserData(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, data)
}

// Import 导入用户数据
func (h *MigrationHandler) Import(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.ImportDataInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	result, err := h.migrationService.ImportUserData(userID, &input)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, result)
}

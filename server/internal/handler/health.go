package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"snail-server/pkg/database"
)

// Health 兼容旧接口
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

// Healthz 存活检查
func Healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

// Readyz 就绪检查（含数据库连接）
func Readyz(c *gin.Context) {
	checks := gin.H{}

	// 检查数据库连接
	sqlDB, err := database.DB.DB()
	if err != nil {
		checks["database"] = "error: " + err.Error()
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "error",
			"checks": checks,
		})
		return
	}

	if err := sqlDB.Ping(); err != nil {
		checks["database"] = "error: " + err.Error()
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "error",
			"checks": checks,
		})
		return
	}

	checks["database"] = "ok"
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"checks": checks,
	})
}

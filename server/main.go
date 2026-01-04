package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"snail-server/internal/handler"
	"snail-server/internal/middleware"
)

func main() {
	// 加载 .env（可选，生产环境用环境变量）
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "23333"
	}

	r := gin.Default()

	// 中间件
	r.Use(middleware.CORS())

	// 健康检查
	r.GET("/health", handler.Health)

	// API 路由组
	api := r.Group("/api/v1")
	{
		api.GET("/ping", handler.Ping)
		// TODO: 添加业务路由
	}

	log.Printf("Server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

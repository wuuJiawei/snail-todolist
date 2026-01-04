package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"snail-server/internal/config"
	"snail-server/internal/handler"
	"snail-server/internal/middleware"
	"snail-server/internal/repository"
	"snail-server/internal/service"
	"snail-server/pkg/database"
	"snail-server/pkg/email"
	"snail-server/pkg/jwt"
)

func main() {
	_ = godotenv.Load()
	config.Load()

	// 初始化 JWT
	jwt.Init(config.AppConfig.JWTSecret, config.AppConfig.JWTExpireHours)

	// 初始化邮件
	email.Init(&email.SMTPConfig{
		Host:     config.AppConfig.SMTPHost,
		Port:     config.AppConfig.SMTPPort,
		User:     config.AppConfig.SMTPUser,
		Password: config.AppConfig.SMTPPassword,
		From:     config.AppConfig.SMTPFrom,
	})

	// 连接数据库
	if err := database.Connect(config.AppConfig.DatabaseURL); err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 自动迁移
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// 初始化 repositories
	userRepo := repository.NewUserRepository(database.DB)
	emailCodeRepo := repository.NewEmailCodeRepository(database.DB)
	listRepo := repository.NewListRepository(database.DB)

	// 初始化 services
	authService := service.NewAuthService(userRepo, emailCodeRepo)
	userService := service.NewUserService(userRepo)
	listService := service.NewListService(listRepo)

	// 初始化 handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	listHandler := handler.NewListHandler(listService)

	r := gin.Default()
	r.Use(middleware.CORS())

	// 健康检查
	r.GET("/health", handler.Health)

	// API 路由
	api := r.Group("/api/v1")
	{
		// 公开路由
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/email/code", authHandler.SendEmailCode)
			auth.POST("/email/login", authHandler.EmailLogin)
		}

		// 需要认证的路由
		protected := api.Group("")
		protected.Use(middleware.JWTAuth())
		{
			// 用户
			protected.GET("/user/profile", userHandler.GetProfile)
			protected.PUT("/user/profile", userHandler.UpdateProfile)
			protected.PUT("/user/password", userHandler.UpdatePassword)

			// 清单
			protected.GET("/lists", listHandler.GetLists)
			protected.POST("/lists", listHandler.CreateList)
			protected.PUT("/lists/:id", listHandler.UpdateList)
			protected.DELETE("/lists/:id", listHandler.DeleteList)
		}
	}

	log.Printf("Server starting on :%s", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

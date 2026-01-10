package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"snail-server/internal/config"
	"snail-server/internal/handler"
	"snail-server/internal/middleware"
	"snail-server/internal/repository"
	"snail-server/internal/service"
	"snail-server/pkg/database"
	"snail-server/pkg/email"
	"snail-server/pkg/jwt"
	"snail-server/pkg/logger"
)

func main() {
	_ = godotenv.Load()
	config.Load()

	// 初始化日志
	logger.Init(config.AppConfig.ServerMode, config.AppConfig.LogLevel)
	defer logger.Sync()

	logger.Info("Starting SnailTask Server...")

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
		logger.Fatal("Failed to connect database", err)
	}

	// 自动迁移
	if err := database.AutoMigrate(); err != nil {
		logger.Fatal("Failed to migrate database", err)
	}

	// 初始化 repositories
	userRepo := repository.NewUserRepository(database.DB)
	emailCodeRepo := repository.NewEmailCodeRepository(database.DB)
	listRepo := repository.NewListRepository(database.DB)
	taskRepo := repository.NewTaskRepository(database.DB)
	listMemberRepo := repository.NewListMemberRepository(database.DB)

	// 初始化 services
	authService := service.NewAuthService(userRepo, emailCodeRepo)
	userService := service.NewUserService(userRepo)
	listService := service.NewListService(listRepo)
	taskService := service.NewTaskService(taskRepo, listRepo)
	overviewService := service.NewOverviewService(listRepo, taskRepo)
	listMemberService := service.NewListMemberService(listMemberRepo, listRepo, userRepo)

	// 初始化 handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	listHandler := handler.NewListHandler(listService)
	taskHandler := handler.NewTaskHandler(taskService)
	overviewHandler := handler.NewOverviewHandler(overviewService, taskService)
	listMemberHandler := handler.NewListMemberHandler(listMemberService)

	// 设置 Gin 模式
	if config.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// 中间件
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.Metrics())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())

	// 健康检查和监控
	r.GET("/healthz", handler.Healthz)
	r.GET("/readyz", handler.Readyz)
	r.GET("/health", handler.Health) // 兼容旧接口
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

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

			// 聚合查询（核心）
			protected.GET("/overview", overviewHandler.GetOverview)
			protected.GET("/today", overviewHandler.GetTodayTasks)
			protected.GET("/upcoming", overviewHandler.GetUpcomingTasks)

			// 清单（项目）
			protected.GET("/lists", listHandler.GetLists)
			protected.POST("/lists", listHandler.CreateList)
			protected.PUT("/lists/:id", listHandler.UpdateList)
			protected.DELETE("/lists/:id", listHandler.DeleteList)
			protected.PATCH("/lists/:id/sort", listHandler.UpdateSortOrder)

			// 清单成员
			protected.GET("/lists/:id/members", listMemberHandler.GetMembers)
			protected.POST("/lists/:id/members", listMemberHandler.InviteMember)
			protected.PUT("/lists/:id/members/:memberId", listMemberHandler.UpdateMember)
			protected.DELETE("/lists/:id/members/:memberId", listMemberHandler.RemoveMember)

			// 任务
			protected.GET("/lists/:id/tasks", taskHandler.GetTasksByList)
			protected.POST("/lists/:id/tasks", taskHandler.CreateTask)
			protected.GET("/tasks/:id", taskHandler.GetTask)
			protected.PUT("/tasks/:id", taskHandler.UpdateTask)
			protected.DELETE("/tasks/:id", taskHandler.DeleteTask)
			protected.PATCH("/tasks/:id/status", taskHandler.UpdateStatus)
			protected.PATCH("/tasks/:id/sort", taskHandler.UpdateSortOrder)

			// 搜索
			protected.GET("/search", taskHandler.SearchTasks)

			// 批量操作
			protected.POST("/tasks/batch/status", taskHandler.BatchUpdateStatus)
			protected.POST("/tasks/batch/delete", taskHandler.BatchDelete)
		}
	}

	// 创建 HTTP 服务器
	srv := &http.Server{
		Addr:    ":" + config.AppConfig.Port,
		Handler: r,
	}

	// 启动服务器（非阻塞）
	go func() {
		logger.Info("Server starting on :" + config.AppConfig.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", err)
		}
	}()

	// 优雅关闭
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", err)
	}

	logger.Info("Server exited")
}

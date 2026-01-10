package database

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"snail-server/internal/model"
)

var DB *gorm.DB

func Connect(dsn string) error {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	log.Println("Database connected")
	return nil
}

func AutoMigrate() error {
	if err := DB.AutoMigrate(
		&model.User{},
		&model.EmailCode{},
		&model.List{},
		&model.Task{},
		&model.ListMember{},
	); err != nil {
		return err
	}

	// 启用 pg_trgm 扩展（用于模糊搜索）
	if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm").Error; err != nil {
		log.Printf("Warning: failed to create pg_trgm extension: %v", err)
	}

	// 创建搜索索引（如果不存在）
	if err := DB.Exec(`
		CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm 
		ON tasks USING gin (title gin_trgm_ops)
	`).Error; err != nil {
		log.Printf("Warning: failed to create trgm index: %v", err)
	}

	return nil
}

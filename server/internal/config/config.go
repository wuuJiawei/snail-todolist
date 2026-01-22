package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// Server
	Port       string
	ServerMode string // development | production

	// Database
	DatabaseURL string

	// JWT
	JWTSecret      string
	JWTExpireHours int

	// CORS
	CORSOrigins []string

	// Log
	LogLevel  string // debug | info | warn | error
	LogFormat string // console | json

	// Storage (attachments)
	StoragePath string
	BaseURL     string
}

var AppConfig *Config

func Load() {
	jwtExpire, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "72"))

	corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
	origins := strings.Split(corsOrigins, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	AppConfig = &Config{
		Port:           getEnv("PORT", "23333"),
		ServerMode:     getEnv("SERVER_MODE", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/snail?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpireHours: jwtExpire,
		CORSOrigins:    origins,
		LogLevel:       getEnv("LOG_LEVEL", "debug"),
		LogFormat:      getEnv("LOG_FORMAT", "console"),
		StoragePath:    getEnv("STORAGE_PATH", "./uploads"),
		BaseURL:        getEnv("BASE_URL", "http://localhost:23333"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func IsDevelopment() bool {
	return AppConfig != nil && AppConfig.ServerMode == "development"
}

func IsProduction() bool {
	return AppConfig != nil && AppConfig.ServerMode == "production"
}

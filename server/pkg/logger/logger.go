package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	Log  *zap.Logger
	once sync.Once
)

// Init 初始化日志器
func Init(mode string, level string) {
	once.Do(func() {
		var config zap.Config

		if mode == "production" {
			config = zap.NewProductionConfig()
			config.EncoderConfig.TimeKey = "timestamp"
			config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		} else {
			config = zap.NewDevelopmentConfig()
			config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		}

		// 设置日志级别
		switch level {
		case "debug":
			config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		case "info":
			config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		case "warn":
			config.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
		case "error":
			config.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
		default:
			config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		}

		var err error
		Log, err = config.Build(zap.AddCallerSkip(1))
		if err != nil {
			panic(err)
		}
	})
}

// GetLogger 获取日志器实例
func GetLogger() *zap.Logger {
	if Log == nil {
		Init(os.Getenv("SERVER_MODE"), os.Getenv("LOG_LEVEL"))
	}
	return Log
}

// WithRequestID 创建带 request_id 的日志器
func WithRequestID(requestID string) *zap.Logger {
	return GetLogger().With(zap.String("request_id", requestID))
}

// Debug 输出 debug 日志
func Debug(msg string, fields ...zap.Field) {
	GetLogger().Debug(msg, fields...)
}

// Info 输出 info 日志
func Info(msg string, fields ...zap.Field) {
	GetLogger().Info(msg, fields...)
}

// Warn 输出 warn 日志
func Warn(msg string, fields ...zap.Field) {
	GetLogger().Warn(msg, fields...)
}

// Error 输出 error 日志
func Error(msg string, fields ...zap.Field) {
	GetLogger().Error(msg, fields...)
}

// Fatal 输出 fatal 日志并退出
func Fatal(msg string, err ...error) {
	if len(err) > 0 && err[0] != nil {
		GetLogger().Fatal(msg, zap.Error(err[0]))
	} else {
		GetLogger().Fatal(msg)
	}
}

// Sync 刷新日志缓冲
func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}

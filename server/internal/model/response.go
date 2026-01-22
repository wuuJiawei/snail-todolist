package model

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         `json:"code"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// 错误码定义
const (
	CodeSuccess          = 0
	CodeParamError       = 1001
	CodeUnauthorized     = 1002
	CodeForbidden        = 1003
	CodeNotFound         = 1004
	CodeEmailExists      = 2001
	CodeInvalidCredential = 2002
	CodeTokenExpired     = 2003
	CodeInternalError    = 5000
)

// 错误码对应的消息
var codeMessages = map[int]string{
	CodeSuccess:          "success",
	CodeParamError:       "参数校验失败",
	CodeUnauthorized:     "未授权",
	CodeForbidden:        "禁止访问",
	CodeNotFound:         "资源不存在",
	CodeEmailExists:      "邮箱已注册",
	CodeInvalidCredential: "邮箱或密码错误",
	CodeTokenExpired:     "Token 已过期",
	CodeInternalError:    "服务器内部错误",
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: CodeSuccess,
		Data: data,
	})
}

// SuccessWithMessage 成功响应带消息
func SuccessWithMessage(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, Response{
		Code:    CodeSuccess,
		Data:    data,
		Message: message,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int, message ...string) {
	msg := codeMessages[code]
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}

	httpStatus := http.StatusBadRequest
	switch code {
	case CodeUnauthorized, CodeTokenExpired:
		httpStatus = http.StatusUnauthorized
	case CodeForbidden:
		httpStatus = http.StatusForbidden
	case CodeNotFound:
		httpStatus = http.StatusNotFound
	case CodeInternalError:
		httpStatus = http.StatusInternalServerError
	}

	c.JSON(httpStatus, Response{
		Code:    code,
		Message: msg,
	})
}

// ErrorWithData 错误响应带数据
func ErrorWithData(c *gin.Context, code int, data interface{}, message ...string) {
	msg := codeMessages[code]
	if len(message) > 0 && message[0] != "" {
		msg = message[0]
	}

	c.JSON(http.StatusBadRequest, Response{
		Code:    code,
		Data:    data,
		Message: msg,
	})
}

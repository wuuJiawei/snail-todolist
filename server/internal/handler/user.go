package handler

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/config"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type UserHandler struct {
	userService *service.UserService
	storagePath string
	baseURL     string
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	storagePath := config.AppConfig.StoragePath
	if storagePath == "" {
		storagePath = "./uploads"
	}
	os.MkdirAll(filepath.Join(storagePath, "avatars"), 0755)
	return &UserHandler{
		userService: userService,
		storagePath: storagePath,
		baseURL:     config.AppConfig.BaseURL,
	}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.userService.GetUser(userID)
	if err != nil {
		model.Error(c, model.CodeNotFound, "用户不存在")
		return
	}

	model.Success(c, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	user, err := h.userService.UpdateUser(userID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, user)
}

func (h *UserHandler) UpdatePassword(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.UpdatePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	if err := h.userService.UpdatePassword(userID, &input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "密码修改成功"})
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		model.Error(c, model.CodeParamError, "请选择文件")
		return
	}
	defer file.Close()

	if header.Size > 2*1024*1024 {
		model.Error(c, model.CodeParamError, "文件大小不能超过 2MB")
		return
	}

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		model.Error(c, model.CodeParamError, "只支持图片文件")
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	avatarDir := filepath.Join(h.storagePath, "avatars")
	filePath := filepath.Join(avatarDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		model.Error(c, model.CodeInternalError, "文件保存失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		model.Error(c, model.CodeInternalError, "文件保存失败")
		return
	}

	avatarURL := fmt.Sprintf("%s/uploads/avatars/%s", h.baseURL, filename)

	if err := h.userService.UpdateAvatarURL(userID, avatarURL); err != nil {
		os.Remove(filePath)
		model.Error(c, model.CodeInternalError, "更新头像失败")
		return
	}

	model.Success(c, gin.H{
		"url": avatarURL,
	})
}

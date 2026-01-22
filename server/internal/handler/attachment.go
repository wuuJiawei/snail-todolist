package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type AttachmentHandler struct {
	taskRepo    *repository.TaskRepository
	storagePath string
	baseURL     string
}

func NewAttachmentHandler(taskRepo *repository.TaskRepository, storagePath, baseURL string) *AttachmentHandler {
	if storagePath == "" {
		storagePath = "./uploads"
	}
	os.MkdirAll(storagePath, 0755)
	return &AttachmentHandler{
		taskRepo:    taskRepo,
		storagePath: storagePath,
		baseURL:     baseURL,
	}
}

func (h *AttachmentHandler) GetAttachments(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	task, err := h.taskRepo.FindByIDIncludeDeleted(taskID)
	if err != nil {
		model.Error(c, model.CodeNotFound, "任务不存在")
		return
	}
	if task.UserID != userID {
		model.Error(c, model.CodeForbidden, "无权访问此任务")
		return
	}

	var attachments []model.TaskAttachment
	if task.Attachments != nil {
		json.Unmarshal(task.Attachments, &attachments)
	}

	model.Success(c, attachments)
}

func (h *AttachmentHandler) UploadAttachment(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}

	task, err := h.taskRepo.FindByID(taskID)
	if err != nil {
		model.Error(c, model.CodeNotFound, "任务不存在")
		return
	}
	if task.UserID != userID {
		model.Error(c, model.CodeForbidden, "无权操作此任务")
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		model.Error(c, model.CodeParamError, "请选择文件")
		return
	}
	defer file.Close()

	if header.Size > 10*1024*1024 {
		model.Error(c, model.CodeParamError, "文件大小不能超过 10MB")
		return
	}

	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(h.storagePath, filename)

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

	attachment := model.TaskAttachment{
		ID:           uuid.New().String(),
		Filename:     filename,
		OriginalName: header.Filename,
		URL:          fmt.Sprintf("%s/uploads/%s", h.baseURL, filename),
		Size:         header.Size,
		Type:         header.Header.Get("Content-Type"),
		UploadedAt:   time.Now(),
	}

	var attachments []model.TaskAttachment
	if task.Attachments != nil {
		json.Unmarshal(task.Attachments, &attachments)
	}
	attachments = append(attachments, attachment)

	attachmentsJSON, _ := json.Marshal(attachments)
	task.Attachments = datatypes.JSON(attachmentsJSON)

	if err := h.taskRepo.Update(task); err != nil {
		model.Error(c, model.CodeInternalError, "保存失败")
		return
	}

	model.Success(c, attachment)
}

func (h *AttachmentHandler) DeleteAttachment(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的任务ID")
		return
	}
	attachmentID := c.Param("attachmentId")

	task, err := h.taskRepo.FindByID(taskID)
	if err != nil {
		model.Error(c, model.CodeNotFound, "任务不存在")
		return
	}
	if task.UserID != userID {
		model.Error(c, model.CodeForbidden, "无权操作此任务")
		return
	}

	var attachments []model.TaskAttachment
	if task.Attachments != nil {
		json.Unmarshal(task.Attachments, &attachments)
	}

	var newAttachments []model.TaskAttachment
	var deletedFilename string
	for _, a := range attachments {
		if a.ID != attachmentID {
			newAttachments = append(newAttachments, a)
		} else {
			deletedFilename = a.Filename
		}
	}

	if deletedFilename != "" {
		os.Remove(filepath.Join(h.storagePath, deletedFilename))
	}

	attachmentsJSON, _ := json.Marshal(newAttachments)
	task.Attachments = datatypes.JSON(attachmentsJSON)

	if err := h.taskRepo.Update(task); err != nil {
		model.Error(c, model.CodeInternalError, "保存失败")
		return
	}

	model.Success(c, gin.H{"message": "删除成功"})
}

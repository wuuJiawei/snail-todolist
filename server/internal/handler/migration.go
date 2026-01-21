package handler

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type MigrationHandler struct {
	migrationService *service.MigrationService
}

func NewMigrationHandler(migrationService *service.MigrationService) *MigrationHandler {
	return &MigrationHandler{migrationService: migrationService}
}

type backupManifest struct {
	Version    string `json:"version"`
	CreatedAt  string `json:"createdAt"`
	AppVersion string `json:"appVersion"`
	Counts     struct {
		Projects int `json:"projects"`
		Tasks    int `json:"tasks"`
		Tags     int `json:"tags"`
		TaskTags int `json:"taskTags"`
	} `json:"counts"`
}

type backupProject struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	Color     string `json:"color"`
	ViewType  string `json:"view_type"`
	SortOrder int    `json:"sort_order"`
	CreatedAt string `json:"created_at,omitempty"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

type backupTask struct {
	ID          string                 `json:"id"`
	Title       string                 `json:"title"`
	Completed   bool                   `json:"completed"`
	Date        *string                `json:"date,omitempty"`
	Project     string                 `json:"project"`
	Description string                 `json:"description,omitempty"`
	Icon        string                 `json:"icon,omitempty"`
	CompletedAt *string                `json:"completed_at,omitempty"`
	UpdatedAt   *string                `json:"updated_at,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	SortOrder   int                    `json:"sort_order,omitempty"`
	Deleted     bool                   `json:"deleted,omitempty"`
	DeletedAt   *string                `json:"deleted_at,omitempty"`
	Abandoned   bool                   `json:"abandoned,omitempty"`
	AbandonedAt *string                `json:"abandoned_at,omitempty"`
	Flagged     bool                   `json:"flagged,omitempty"`
	Attachments []model.TaskAttachment `json:"attachments,omitempty"`
	Status      string                 `json:"status,omitempty"`
}

type backupTag struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ProjectID *string `json:"project_id,omitempty"`
}

type backupTaskTag struct {
	TaskID string `json:"task_id"`
	TagID  string `json:"tag_id"`
}

// Export 导出用户全部数据
func (h *MigrationHandler) Export(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	data, err := h.migrationService.ExportUserData(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	format := strings.ToLower(c.DefaultQuery("format", "json"))
	if format == "zip" {
		buf, filename, err := h.buildBackupZip(data)
		if err != nil {
			model.Error(c, model.CodeInternalError, err.Error())
			return
		}
		c.Header("Content-Type", "application/zip")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		_, _ = c.Writer.Write(buf.Bytes())
		return
	}

	model.Success(c, data)
}

// Import 导入用户数据
func (h *MigrationHandler) Import(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	mode := strings.ToLower(c.DefaultQuery("mode", "merge"))
	replace := mode == "replace"

	var input *service.ImportDataInput
	var err error

	// 优先支持上传的 ZIP 备份文件（兼容离线/旧版）
	if strings.HasPrefix(c.ContentType(), "multipart/") {
		file, fileErr := c.FormFile("file")
		if fileErr != nil {
			model.Error(c, model.CodeParamError, fileErr.Error())
			return
		}
		input, err = h.parseBackupFile(file)
		if err != nil {
			model.Error(c, model.CodeParamError, err.Error())
			return
		}
	} else {
		var body service.ImportDataInput
		if bindErr := c.ShouldBindJSON(&body); bindErr != nil {
			model.Error(c, model.CodeParamError, bindErr.Error())
			return
		}
		input = &body
	}

	result, err := h.migrationService.ImportUserData(userID, input, replace)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, result)
}

// buildBackupZip 将导出的数据转换为前端/离线模式兼容的 ZIP 备份文件
func (h *MigrationHandler) buildBackupZip(data *service.ExportData) (*bytes.Buffer, string, error) {
	buffer := &bytes.Buffer{}
	zw := zip.NewWriter(buffer)

	// 准备清单数据
	projects := make([]backupProject, 0, len(data.Lists))
	for _, l := range data.Lists {
		project := backupProject{
			ID:        l.ID.String(),
			Name:      l.Name,
			Icon:      defaultValue(l.Icon, "folder"),
			Color:     defaultValue(l.Color, "#4CAF50"),
			ViewType:  "list",
			SortOrder: l.SortOrder,
		}
		if !l.CreatedAt.IsZero() {
			project.CreatedAt = l.CreatedAt.Format(time.RFC3339)
		}
		if !l.UpdatedAt.IsZero() {
			project.UpdatedAt = l.UpdatedAt.Format(time.RFC3339)
		}
		projects = append(projects, project)
	}

	// 准备任务数据
	tasks := make([]backupTask, 0, len(data.Tasks))
	for _, t := range data.Tasks {
		dueDate := stringPtrFromTime(t.DueDate)
		completedAt := stringPtrFromTime(t.CompletedAt)
		updatedAt := stringPtrFromTime(&t.UpdatedAt)
		deletedAt := stringPtrFromTime(t.DeletedAt)
		abandonedAt := stringPtrFromTime(t.AbandonedAt)

		attachments := []model.TaskAttachment{}
		if len(t.Attachments) > 0 {
			_ = json.Unmarshal(t.Attachments, &attachments)
		}

		task := backupTask{
			ID:          t.ID.String(),
			Title:       t.Title,
			Completed:   t.Completed || t.Status == model.TaskStatusDone,
			Date:        dueDate,
			Project:     t.ListID.String(),
			Description: t.Description,
			Icon:        t.Icon,
			CompletedAt: completedAt,
			UpdatedAt:   updatedAt,
			UserID:      t.UserID.String(),
			SortOrder:   t.SortOrder,
			Deleted:     t.Deleted,
			DeletedAt:   deletedAt,
			Abandoned:   t.Abandoned,
			AbandonedAt: abandonedAt,
			Flagged:     t.Flagged,
			Attachments: attachments,
			Status:      string(t.Status),
		}
		tasks = append(tasks, task)
	}

	// 标签
	tags := make([]backupTag, 0, len(data.Tags))
	for _, t := range data.Tags {
		bt := backupTag{
			ID:   t.ID.String(),
			Name: t.Name,
		}
		if t.ProjectID != nil {
			id := t.ProjectID.String()
			bt.ProjectID = &id
		}
		tags = append(tags, bt)
	}

	// 任务-标签关联
	taskTags := make([]backupTaskTag, 0, len(data.TaskTags))
	for _, tt := range data.TaskTags {
		taskTags = append(taskTags, backupTaskTag{
			TaskID: tt.TaskID.String(),
			TagID:  tt.TagID.String(),
		})
	}

	manifest := backupManifest{
		Version:    "1.0",
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
		AppVersion: "go-server",
	}
	manifest.Counts.Projects = len(projects)
	manifest.Counts.Tasks = len(tasks)
	manifest.Counts.Tags = len(tags)
	manifest.Counts.TaskTags = len(taskTags)

	if err := addJSONToZip(zw, "manifest.json", manifest); err != nil {
		return nil, "", err
	}
	if err := addJSONToZip(zw, "projects.json", projects); err != nil {
		return nil, "", err
	}
	if err := addJSONToZip(zw, "tasks.json", tasks); err != nil {
		return nil, "", err
	}
	if err := addJSONToZip(zw, "tags.json", tags); err != nil {
		return nil, "", err
	}
	if err := addJSONToZip(zw, "task_tags.json", taskTags); err != nil {
		return nil, "", err
	}

	if err := zw.Close(); err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("snailtodo-backup-%s.zip", time.Now().Format("20060102"))
	return buffer, filename, nil
}

// parseBackupFile 解析上传的 ZIP 备份（离线/旧版导出格式），并转换为导入结构
func (h *MigrationHandler) parseBackupFile(file *multipart.FileHeader) (*service.ImportDataInput, error) {
	f, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	content, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}

	zr, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return nil, fmt.Errorf("无法读取备份文件: %w", err)
	}

	var manifest backupManifest
	if err := readZipJSON(zr, "manifest.json", &manifest); err != nil {
		return nil, fmt.Errorf("备份文件缺少 manifest.json 或格式错误: %w", err)
	}

	var projects []backupProject
	if err := readZipJSON(zr, "projects.json", &projects); err != nil {
		return nil, fmt.Errorf("备份文件缺少 projects.json: %w", err)
	}

	var tasks []backupTask
	if err := readZipJSON(zr, "tasks.json", &tasks); err != nil {
		return nil, fmt.Errorf("备份文件缺少 tasks.json: %w", err)
	}

	var tags []backupTag
	if err := readZipJSON(zr, "tags.json", &tags); err != nil {
		return nil, fmt.Errorf("备份文件缺少 tags.json: %w", err)
	}

	var taskTags []backupTaskTag
	if err := readZipJSON(zr, "task_tags.json", &taskTags); err != nil {
		return nil, fmt.Errorf("备份文件缺少 task_tags.json: %w", err)
	}

	// 转换为导入结构
	importInput := &service.ImportDataInput{
		Lists:            make([]service.ImportList, 0, len(projects)),
		Tasks:            make([]service.ImportTask, 0, len(tasks)),
		Tags:             make([]service.ImportTag, 0, len(tags)),
		TaskTags:         make([]service.ImportTaskTag, 0, len(taskTags)),
		PomodoroSessions: []service.ImportPomodoroSession{},
	}

	for _, p := range projects {
		importInput.Lists = append(importInput.Lists, service.ImportList{
			ID:        p.ID,
			Name:      p.Name,
			Icon:      defaultValue(p.Icon, "folder"),
			Color:     defaultValue(p.Color, "#4CAF50"),
			ViewType:  defaultValue(p.ViewType, "list"),
			SortOrder: p.SortOrder,
		})
	}

	for _, t := range tasks {
		importInput.Tasks = append(importInput.Tasks, service.ImportTask{
			ID:          t.ID,
			ListID:      t.Project,
			Title:       t.Title,
			Description: t.Description,
			Status:      defaultValue(t.Status, statusFromCompletion(t.Completed)),
			DueDate:     t.Date,
			Completed:   t.Completed,
			CompletedAt: t.CompletedAt,
			Flagged:     t.Flagged,
			Icon:        t.Icon,
			SortOrder:   t.SortOrder,
			Deleted:     t.Deleted,
			DeletedAt:   t.DeletedAt,
			Abandoned:   t.Abandoned,
			AbandonedAt: t.AbandonedAt,
			Attachments: t.Attachments,
		})
	}

	for _, tg := range tags {
		importInput.Tags = append(importInput.Tags, service.ImportTag{
			ID:        tg.ID,
			Name:      tg.Name,
			ProjectID: tg.ProjectID,
		})
	}

	for _, tt := range taskTags {
		importInput.TaskTags = append(importInput.TaskTags, service.ImportTaskTag{
			TaskID: tt.TaskID,
			TagID:  tt.TagID,
		})
	}

	return importInput, nil
}

func addJSONToZip(zw *zip.Writer, name string, v interface{}) error {
	w, err := zw.Create(name)
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}

func readZipJSON(zr *zip.Reader, name string, out interface{}) error {
	for _, f := range zr.File {
		if f.Name == name {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			defer rc.Close()
			decoder := json.NewDecoder(rc)
			return decoder.Decode(out)
		}
	}
	return fmt.Errorf("%s not found", name)
}

func defaultValue(v string, defaultVal string) string {
	if strings.TrimSpace(v) == "" {
		return defaultVal
	}
	return v
}

func stringPtrFromTime(t *time.Time) *string {
	if t == nil {
		return nil
	}
	str := t.Format(time.RFC3339)
	return &str
}

func statusFromCompletion(completed bool) string {
	if completed {
		return string(model.TaskStatusDone)
	}
	return string(model.TaskStatusTodo)
}

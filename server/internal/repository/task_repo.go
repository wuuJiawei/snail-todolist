package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(task *model.Task) error {
	return r.db.Create(task).Error
}

func (r *TaskRepository) FindByID(id uuid.UUID) (*model.Task, error) {
	var task model.Task
	err := r.db.First(&task, "id = ? AND deleted = false", id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

// FindByIDIncludeDeleted 查找任务（包括已删除的）
func (r *TaskRepository) FindByIDIncludeDeleted(id uuid.UUID) (*model.Task, error) {
	var task model.Task
	err := r.db.First(&task, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) FindByListID(listID uuid.UUID, status string, limit, offset int) ([]model.Task, int64, error) {
	var tasks []model.Task
	var total int64

	query := r.db.Model(&model.Task{}).Where("list_id = ? AND deleted = false", listID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	err := query.Order("sort_order ASC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&tasks).Error

	return tasks, total, err
}

func (r *TaskRepository) FindByUserID(userID uuid.UUID, status string, limit, offset int) ([]model.Task, int64, error) {
	var tasks []model.Task
	var total int64

	query := r.db.Model(&model.Task{}).Where("user_id = ? AND deleted = false", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	err := query.Order("sort_order ASC, created_at DESC").
		Limit(limit).Offset(offset).
		Find(&tasks).Error

	return tasks, total, err
}

func (r *TaskRepository) Update(task *model.Task) error {
	return r.db.Save(task).Error
}

func (r *TaskRepository) Delete(id uuid.UUID) error {
	return r.db.Unscoped().Delete(&model.Task{}, "id = ?", id).Error
}

// SoftDelete 软删除任务（移入回收站）
func (r *TaskRepository) SoftDelete(id uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&model.Task{}).Where("id = ?", id).Updates(map[string]interface{}{
		"deleted":    true,
		"deleted_at": now,
	}).Error
}

// Restore 恢复任务（从回收站恢复）
func (r *TaskRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Updates(map[string]interface{}{
		"deleted":    false,
		"deleted_at": nil,
	}).Error
}

// GetTrashTasks 获取回收站任务
func (r *TaskRepository) GetTrashTasks(userID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.Preload("List").
		Where("user_id = ? AND deleted = true", userID).
		Order("deleted_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *TaskRepository) UpdateStatus(id uuid.UUID, status model.TaskStatus) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("status", status).Error
}

// GetTodayTasks 获取今日任务
func (r *TaskRepository) GetTodayTasks(userID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	today := time.Now().Format("2006-01-02")

	err := r.db.Preload("List").
		Where("user_id = ? AND DATE(due_date) = ? AND status != ? AND deleted = false", userID, today, model.TaskStatusDone).
		Order("priority DESC, created_at ASC").
		Find(&tasks).Error

	return tasks, err
}

// GetUpcomingTasks 获取即将到期任务（7天内）
func (r *TaskRepository) GetUpcomingTasks(userID uuid.UUID, days int) ([]model.Task, error) {
	var tasks []model.Task
	now := time.Now()
	future := now.AddDate(0, 0, days)

	err := r.db.Preload("List").
		Where("user_id = ? AND due_date BETWEEN ? AND ? AND status != ? AND deleted = false",
			userID, now, future, model.TaskStatusDone).
		Order("due_date ASC, priority DESC").
		Find(&tasks).Error

	return tasks, err
}

// GetOverdueTasks 获取逾期任务
func (r *TaskRepository) GetOverdueTasks(userID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	today := time.Now().Format("2006-01-02")

	err := r.db.Preload("List").
		Where("user_id = ? AND DATE(due_date) < ? AND status != ? AND deleted = false", userID, today, model.TaskStatusDone).
		Order("due_date ASC").
		Find(&tasks).Error

	return tasks, err
}

// CountByListID 统计清单下的任务数量
func (r *TaskRepository) CountByListID(listID uuid.UUID) (total, todo, doing, done int64, err error) {
	r.db.Model(&model.Task{}).Where("list_id = ? AND deleted = false", listID).Count(&total)
	r.db.Model(&model.Task{}).Where("list_id = ? AND status = ? AND deleted = false", listID, model.TaskStatusTodo).Count(&todo)
	r.db.Model(&model.Task{}).Where("list_id = ? AND status = ? AND deleted = false", listID, model.TaskStatusDoing).Count(&doing)
	r.db.Model(&model.Task{}).Where("list_id = ? AND status = ? AND deleted = false", listID, model.TaskStatusDone).Count(&done)
	return
}

// CountByUserID 统计用户的任务数量
func (r *TaskRepository) CountByUserID(userID uuid.UUID) (total, todo, doing, done, overdue int64, err error) {
	r.db.Model(&model.Task{}).Where("user_id = ? AND deleted = false", userID).Count(&total)
	r.db.Model(&model.Task{}).Where("user_id = ? AND status = ? AND deleted = false", userID, model.TaskStatusTodo).Count(&todo)
	r.db.Model(&model.Task{}).Where("user_id = ? AND status = ? AND deleted = false", userID, model.TaskStatusDoing).Count(&doing)
	r.db.Model(&model.Task{}).Where("user_id = ? AND status = ? AND deleted = false", userID, model.TaskStatusDone).Count(&done)

	today := time.Now().Format("2006-01-02")
	r.db.Model(&model.Task{}).
		Where("user_id = ? AND DATE(due_date) < ? AND status != ? AND deleted = false", userID, today, model.TaskStatusDone).
		Count(&overdue)

	return
}

// SearchResult 搜索结果（包含清单名称）
type SearchResult struct {
	model.Task
	ListName string `json:"list_name"`
}

// Search 搜索任务（使用 pg_trgm 模糊匹配）
func (r *TaskRepository) Search(userID uuid.UUID, query string, limit int) ([]SearchResult, error) {
	var results []SearchResult

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	err := r.db.Table("tasks").
		Select("tasks.*, lists.name as list_name").
		Joins("LEFT JOIN lists ON lists.id = tasks.list_id").
		Where("tasks.user_id = ? AND tasks.deleted = false", userID).
		Where("tasks.title ILIKE ?", "%"+query+"%").
		Order("tasks.created_at DESC").
		Limit(limit).
		Scan(&results).Error

	return results, err
}

// BatchUpdateStatus 批量更新任务状态
func (r *TaskRepository) BatchUpdateStatus(userID uuid.UUID, taskIDs []uuid.UUID, status model.TaskStatus) (int64, error) {
	result := r.db.Model(&model.Task{}).
		Where("id IN ? AND user_id = ?", taskIDs, userID).
		Update("status", status)
	return result.RowsAffected, result.Error
}

// BatchDelete 批量删除任务（软删除）
func (r *TaskRepository) BatchDelete(userID uuid.UUID, taskIDs []uuid.UUID) (int64, error) {
	result := r.db.Where("id IN ? AND user_id = ?", taskIDs, userID).Delete(&model.Task{})
	return result.RowsAffected, result.Error
}

// GetSortOrder 获取指定任务的 sort_order
func (r *TaskRepository) GetSortOrder(taskID uuid.UUID) (int, error) {
	var task model.Task
	err := r.db.Select("sort_order").First(&task, "id = ?", taskID).Error
	return task.SortOrder, err
}

// UpdateSortOrder 更新任务的 sort_order
func (r *TaskRepository) UpdateSortOrder(taskID uuid.UUID, sortOrder int) error {
	return r.db.Model(&model.Task{}).Where("id = ?", taskID).Update("sort_order", sortOrder).Error
}

// GetAdjacentSortOrders 获取相邻任务的 sort_order（用于计算新位置）
func (r *TaskRepository) GetAdjacentSortOrders(listID uuid.UUID, afterID, beforeID *uuid.UUID) (afterOrder, beforeOrder int, err error) {
	if afterID != nil {
		var task model.Task
		if err = r.db.Select("sort_order").First(&task, "id = ?", *afterID).Error; err != nil {
			return
		}
		afterOrder = task.SortOrder
	} else {
		afterOrder = -1000000
	}

	if beforeID != nil {
		var task model.Task
		if err = r.db.Select("sort_order").First(&task, "id = ?", *beforeID).Error; err != nil {
			return
		}
		beforeOrder = task.SortOrder
	} else {
		beforeOrder = afterOrder + 2000
	}

	return
}

// GetFlaggedTasks 获取标记的任务
func (r *TaskRepository) GetFlaggedTasks(userID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.Preload("List").
		Where("user_id = ? AND flagged = true AND deleted = false", userID).
		Order("updated_at DESC").
		Find(&tasks).Error
	return tasks, err
}

// SetFlagged 设置任务标记状态
func (r *TaskRepository) SetFlagged(id uuid.UUID, flagged bool) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("flagged", flagged).Error
}

// SetAbandoned 设置任务放弃状态
func (r *TaskRepository) SetAbandoned(id uuid.UUID, abandoned bool) error {
	updates := map[string]interface{}{
		"abandoned": abandoned,
	}
	if abandoned {
		now := time.Now()
		updates["abandoned_at"] = now
	} else {
		updates["abandoned_at"] = nil
	}
	return r.db.Model(&model.Task{}).Where("id = ?", id).Updates(updates).Error
}

// FindAllByUserID 获取用户所有任务（用于数据导出）
func (r *TaskRepository) FindAllByUserID(userID uuid.UUID) ([]model.Task, error) {
	var tasks []model.Task
	err := r.db.Where("user_id = ?", userID).
		Order("created_at ASC").
		Find(&tasks).Error
	return tasks, err
}

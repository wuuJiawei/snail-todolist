package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type PomodoroRepository struct {
	db *gorm.DB
}

func NewPomodoroRepository(db *gorm.DB) *PomodoroRepository {
	return &PomodoroRepository{db: db}
}

func (r *PomodoroRepository) Create(session *model.PomodoroSession) error {
	return r.db.Create(session).Error
}

func (r *PomodoroRepository) FindByID(id uuid.UUID) (*model.PomodoroSession, error) {
	var session model.PomodoroSession
	err := r.db.First(&session, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *PomodoroRepository) FindByUser(userID uuid.UUID, startDate, endDate *time.Time, limit, offset int) ([]model.PomodoroSession, int64, error) {
	var sessions []model.PomodoroSession
	var total int64

	query := r.db.Model(&model.PomodoroSession{}).Where("user_id = ?", userID)

	if startDate != nil {
		query = query.Where("start_time >= ?", *startDate)
	}
	if endDate != nil {
		query = query.Where("start_time <= ?", *endDate)
	}

	query.Count(&total)

	err := query.Order("start_time DESC").
		Limit(limit).Offset(offset).
		Find(&sessions).Error

	return sessions, total, err
}

func (r *PomodoroRepository) FindActive(userID uuid.UUID) (*model.PomodoroSession, error) {
	var session model.PomodoroSession
	err := r.db.First(&session, "user_id = ? AND end_time IS NULL", userID).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *PomodoroRepository) Update(session *model.PomodoroSession) error {
	return r.db.Save(session).Error
}

func (r *PomodoroRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.PomodoroSession{}, "id = ?", id).Error
}

type TodayStats struct {
	TotalSessions     int64 `json:"total_sessions"`
	CompletedSessions int64 `json:"completed_sessions"`
	TotalMinutes      int64 `json:"total_minutes"`
	FocusMinutes      int64 `json:"focus_minutes"`
}

func (r *PomodoroRepository) GetTodayStats(userID uuid.UUID) (*TodayStats, error) {
	today := time.Now().Format("2006-01-02")
	stats := &TodayStats{}

	r.db.Model(&model.PomodoroSession{}).
		Where("user_id = ? AND DATE(start_time) = ?", userID, today).
		Count(&stats.TotalSessions)

	r.db.Model(&model.PomodoroSession{}).
		Where("user_id = ? AND DATE(start_time) = ? AND completed = true", userID, today).
		Count(&stats.CompletedSessions)

	var totalMinutes, focusMinutes struct{ Sum int64 }

	r.db.Model(&model.PomodoroSession{}).
		Select("COALESCE(SUM(duration), 0) as sum").
		Where("user_id = ? AND DATE(start_time) = ? AND completed = true", userID, today).
		Scan(&totalMinutes)
	stats.TotalMinutes = totalMinutes.Sum

	r.db.Model(&model.PomodoroSession{}).
		Select("COALESCE(SUM(duration), 0) as sum").
		Where("user_id = ? AND DATE(start_time) = ? AND completed = true AND type = ?", userID, today, model.PomodoroFocus).
		Scan(&focusMinutes)
	stats.FocusMinutes = focusMinutes.Sum

	return stats, nil
}

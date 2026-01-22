package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type PomodoroService struct {
	pomodoroRepo *repository.PomodoroRepository
}

func NewPomodoroService(pomodoroRepo *repository.PomodoroRepository) *PomodoroService {
	return &PomodoroService{pomodoroRepo: pomodoroRepo}
}

type StartSessionInput struct {
	Duration int                       `json:"duration" binding:"required,min=1,max=120"`
	Type     model.PomodoroSessionType `json:"type" binding:"required,oneof=focus short_break long_break"`
	Title    *string                   `json:"title"`
}

type SessionListResponse struct {
	Sessions []model.PomodoroSession `json:"sessions"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	Limit    int                     `json:"limit"`
}

func (s *PomodoroService) StartSession(userID uuid.UUID, input *StartSessionInput) (*model.PomodoroSession, error) {
	active, _ := s.pomodoroRepo.FindActive(userID)
	if active != nil {
		return nil, errors.New("已有进行中的会话")
	}

	session := &model.PomodoroSession{
		UserID:    userID,
		StartTime: time.Now(),
		Duration:  input.Duration,
		Type:      input.Type,
		Completed: false,
		Title:     input.Title,
	}

	if err := s.pomodoroRepo.Create(session); err != nil {
		return nil, err
	}

	return session, nil
}

func (s *PomodoroService) GetSessions(userID uuid.UUID, startDate, endDate *time.Time, page, limit int) (*SessionListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	sessions, total, err := s.pomodoroRepo.FindByUser(userID, startDate, endDate, limit, offset)
	if err != nil {
		return nil, err
	}

	return &SessionListResponse{
		Sessions: sessions,
		Total:    total,
		Page:     page,
		Limit:    limit,
	}, nil
}

func (s *PomodoroService) GetActiveSession(userID uuid.UUID) (*model.PomodoroSession, error) {
	return s.pomodoroRepo.FindActive(userID)
}

func (s *PomodoroService) CompleteSession(userID, sessionID uuid.UUID) (*model.PomodoroSession, error) {
	session, err := s.pomodoroRepo.FindByID(sessionID)
	if err != nil {
		return nil, errors.New("会话不存在")
	}
	if session.UserID != userID {
		return nil, errors.New("无权操作此会话")
	}
	if session.EndTime != nil {
		return nil, errors.New("会话已结束")
	}

	now := time.Now()
	session.EndTime = &now
	session.Completed = true

	if err := s.pomodoroRepo.Update(session); err != nil {
		return nil, err
	}

	return session, nil
}

func (s *PomodoroService) CancelSession(userID, sessionID uuid.UUID) (*model.PomodoroSession, error) {
	session, err := s.pomodoroRepo.FindByID(sessionID)
	if err != nil {
		return nil, errors.New("会话不存在")
	}
	if session.UserID != userID {
		return nil, errors.New("无权操作此会话")
	}
	if session.EndTime != nil {
		return nil, errors.New("会话已结束")
	}

	now := time.Now()
	session.EndTime = &now
	session.Completed = false

	if err := s.pomodoroRepo.Update(session); err != nil {
		return nil, err
	}

	return session, nil
}

func (s *PomodoroService) DeleteSession(userID, sessionID uuid.UUID) error {
	session, err := s.pomodoroRepo.FindByID(sessionID)
	if err != nil {
		return errors.New("会话不存在")
	}
	if session.UserID != userID {
		return errors.New("无权操作此会话")
	}

	return s.pomodoroRepo.Delete(sessionID)
}

func (s *PomodoroService) GetTodayStats(userID uuid.UUID) (*repository.TodayStats, error) {
	return s.pomodoroRepo.GetTodayStats(userID)
}

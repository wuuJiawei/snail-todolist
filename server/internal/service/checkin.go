package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type CheckInService struct {
	repo *repository.CheckInRepository
}

func NewCheckInService(repo *repository.CheckInRepository) *CheckInService {
	return &CheckInService{repo: repo}
}

func (s *CheckInService) CreateCheckIn(userID uuid.UUID, note *string) (*model.CheckInRecord, error) {
	// 检查今天是否已打卡
	hasCheckedIn, err := s.repo.HasCheckedInToday(userID)
	if err != nil {
		return nil, err
	}
	if hasCheckedIn {
		return nil, errors.New("already checked in today")
	}

	record := &model.CheckInRecord{
		UserID:      userID,
		CheckInTime: time.Now(),
		Note:        note,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *CheckInService) HasCheckedInToday(userID uuid.UUID) (bool, error) {
	return s.repo.HasCheckedInToday(userID)
}

func (s *CheckInService) GetHistory(userID uuid.UUID, page, pageSize int) ([]model.CheckInRecord, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 365
	}
	return s.repo.GetHistory(userID, page, pageSize)
}

func (s *CheckInService) GetStreak(userID uuid.UUID) (int, error) {
	records, err := s.repo.GetAllByUser(userID)
	if err != nil {
		return 0, err
	}

	if len(records) == 0 {
		return 0, nil
	}

	today := time.Now().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)
	
	lastCheckIn := records[0].CheckInTime.Truncate(24 * time.Hour)
	if !lastCheckIn.Equal(today) && !lastCheckIn.Equal(yesterday) {
		return 0, nil
	}

	streak := 1
	expectedDate := lastCheckIn.AddDate(0, 0, -1)
	
	for i := 1; i < len(records); i++ {
		currentDate := records[i].CheckInTime.Truncate(24 * time.Hour)
		if currentDate.Equal(expectedDate) {
			streak++
			expectedDate = expectedDate.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	return streak, nil
}

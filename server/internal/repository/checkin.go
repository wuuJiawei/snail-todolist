package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type CheckInRepository struct {
	db *gorm.DB
}

func NewCheckInRepository(db *gorm.DB) *CheckInRepository {
	return &CheckInRepository{db: db}
}

func (r *CheckInRepository) Create(record *model.CheckInRecord) error {
	return r.db.Create(record).Error
}

func (r *CheckInRepository) HasCheckedInToday(userID uuid.UUID) (bool, error) {
	var count int64
	now := time.Now()
	// 使用本地时区的今天开始时间
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.Add(24 * time.Hour)
	
	err := r.db.Model(&model.CheckInRecord{}).
		Where("user_id = ? AND check_in_time >= ? AND check_in_time < ?", userID, today, tomorrow).
		Count(&count).Error
	
	return count > 0, err
}

func (r *CheckInRepository) GetHistory(userID uuid.UUID, page, pageSize int) ([]model.CheckInRecord, int64, error) {
	var records []model.CheckInRecord
	var total int64
	
	offset := (page - 1) * pageSize
	
	if err := r.db.Model(&model.CheckInRecord{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	err := r.db.Where("user_id = ?", userID).
		Order("check_in_time DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&records).Error
	
	return records, total, err
}

func (r *CheckInRepository) GetAllByUser(userID uuid.UUID) ([]model.CheckInRecord, error) {
	var records []model.CheckInRecord
	err := r.db.Where("user_id = ?", userID).
		Order("check_in_time DESC").
		Find(&records).Error
	return records, err
}

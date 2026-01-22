package repository

import (
	"time"

	"gorm.io/gorm"
	"snail-server/internal/model"
)

type EmailCodeRepository struct {
	db *gorm.DB
}

func NewEmailCodeRepository(db *gorm.DB) *EmailCodeRepository {
	return &EmailCodeRepository{db: db}
}

func (r *EmailCodeRepository) Create(code *model.EmailCode) error {
	return r.db.Create(code).Error
}

func (r *EmailCodeRepository) FindValidCode(email, code, codeType string) (*model.EmailCode, error) {
	var emailCode model.EmailCode
	err := r.db.Where(
		"email = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
		email, code, codeType, false, time.Now(),
	).First(&emailCode).Error
	if err != nil {
		return nil, err
	}
	return &emailCode, nil
}

func (r *EmailCodeRepository) MarkUsed(id uint) error {
	return r.db.Model(&model.EmailCode{}).Where("id = ?", id).Update("used", true).Error
}

func (r *EmailCodeRepository) CleanExpired() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&model.EmailCode{}).Error
}

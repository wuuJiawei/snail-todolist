package repository

import (
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type SystemSettingRepository struct {
	db *gorm.DB
}

func NewSystemSettingRepository(db *gorm.DB) *SystemSettingRepository {
	return &SystemSettingRepository{db: db}
}

func (r *SystemSettingRepository) Get(key string) (string, error) {
	var setting model.SystemSetting
	err := r.db.Where("key = ?", key).First(&setting).Error
	if err != nil {
		return "", err
	}
	return setting.Value, nil
}

func (r *SystemSettingRepository) Set(key, value string) error {
	var setting model.SystemSetting
	err := r.db.Where("key = ?", key).First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		setting = model.SystemSetting{Key: key, Value: value}
		return r.db.Create(&setting).Error
	}
	if err != nil {
		return err
	}
	setting.Value = value
	return r.db.Save(&setting).Error
}

func (r *SystemSettingRepository) GetMultiple(keys []string) (map[string]string, error) {
	var settings []model.SystemSetting
	err := r.db.Where("key IN ?", keys).Find(&settings).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	return result, nil
}

func (r *SystemSettingRepository) SetMultiple(data map[string]string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for key, value := range data {
			var setting model.SystemSetting
			err := tx.Where("key = ?", key).First(&setting).Error
			if err == gorm.ErrRecordNotFound {
				setting = model.SystemSetting{Key: key, Value: value}
				if err := tx.Create(&setting).Error; err != nil {
					return err
				}
				continue
			}
			if err != nil {
				return err
			}
			setting.Value = value
			if err := tx.Save(&setting).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

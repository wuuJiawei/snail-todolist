package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type ProjectShareRepository struct {
	db *gorm.DB
}

func NewProjectShareRepository(db *gorm.DB) *ProjectShareRepository {
	return &ProjectShareRepository{db: db}
}

func (r *ProjectShareRepository) Create(share *model.ProjectShare) error {
	return r.db.Create(share).Error
}

func (r *ProjectShareRepository) FindByCode(code string) (*model.ProjectShare, error) {
	var share model.ProjectShare
	err := r.db.Preload("Project").First(&share, "share_code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &share, nil
}

func (r *ProjectShareRepository) FindActiveByProject(projectID uuid.UUID) (*model.ProjectShare, error) {
	var share model.ProjectShare
	now := time.Now()
	err := r.db.First(&share, "project_id = ? AND is_active = true AND expires_at > ?", projectID, now).Error
	if err != nil {
		return nil, err
	}
	return &share, nil
}

func (r *ProjectShareRepository) Deactivate(id uuid.UUID) error {
	return r.db.Model(&model.ProjectShare{}).Where("id = ?", id).Update("is_active", false).Error
}

func (r *ProjectShareRepository) DeactivateByProject(projectID uuid.UUID) error {
	return r.db.Model(&model.ProjectShare{}).Where("project_id = ?", projectID).Update("is_active", false).Error
}

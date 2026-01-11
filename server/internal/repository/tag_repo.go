package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type TagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{db: db}
}

func (r *TagRepository) Create(tag *model.Tag) error {
	return r.db.Create(tag).Error
}

func (r *TagRepository) FindByID(id uuid.UUID) (*model.Tag, error) {
	var tag model.Tag
	err := r.db.First(&tag, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

func (r *TagRepository) FindByUser(userID uuid.UUID) ([]model.Tag, error) {
	var tags []model.Tag
	err := r.db.Where("user_id = ?", userID).Order("name ASC").Find(&tags).Error
	return tags, err
}

func (r *TagRepository) FindByProject(userID uuid.UUID, projectID uuid.UUID) ([]model.Tag, error) {
	var tags []model.Tag
	err := r.db.Where("user_id = ? AND (project_id = ? OR project_id IS NULL)", userID, projectID).
		Order("name ASC").Find(&tags).Error
	return tags, err
}

func (r *TagRepository) Update(tag *model.Tag) error {
	return r.db.Save(tag).Error
}

func (r *TagRepository) Delete(id uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&model.TaskTag{}, "tag_id = ?", id).Error; err != nil {
			return err
		}
		return tx.Delete(&model.Tag{}, "id = ?", id).Error
	})
}

func (r *TagRepository) FindByName(userID uuid.UUID, name string) (*model.Tag, error) {
	var tag model.Tag
	err := r.db.First(&tag, "user_id = ? AND name = ?", userID, name).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

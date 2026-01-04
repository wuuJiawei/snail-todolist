package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type ListRepository struct {
	db *gorm.DB
}

func NewListRepository(db *gorm.DB) *ListRepository {
	return &ListRepository{db: db}
}

func (r *ListRepository) Create(list *model.List) error {
	return r.db.Create(list).Error
}

func (r *ListRepository) FindByUserID(userID uuid.UUID) ([]model.List, error) {
	var lists []model.List
	err := r.db.Where("user_id = ?", userID).Order("sort_order ASC, created_at ASC").Find(&lists).Error
	return lists, err
}

func (r *ListRepository) FindByID(id uuid.UUID) (*model.List, error) {
	var list model.List
	err := r.db.First(&list, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &list, nil
}

func (r *ListRepository) Update(list *model.List) error {
	return r.db.Save(list).Error
}

func (r *ListRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.List{}, "id = ?", id).Error
}

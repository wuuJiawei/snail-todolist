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

// UpdateSortOrder 更新清单的 sort_order
func (r *ListRepository) UpdateSortOrder(listID uuid.UUID, sortOrder int) error {
	return r.db.Model(&model.List{}).Where("id = ?", listID).Update("sort_order", sortOrder).Error
}

// GetAdjacentSortOrders 获取相邻清单的 sort_order
func (r *ListRepository) GetAdjacentSortOrders(userID uuid.UUID, afterID, beforeID *uuid.UUID) (afterOrder, beforeOrder int, err error) {
	if afterID != nil {
		var list model.List
		if err = r.db.Select("sort_order").First(&list, "id = ?", *afterID).Error; err != nil {
			return
		}
		afterOrder = list.SortOrder
	} else {
		afterOrder = -1000000
	}

	if beforeID != nil {
		var list model.List
		if err = r.db.Select("sort_order").First(&list, "id = ?", *beforeID).Error; err != nil {
			return
		}
		beforeOrder = list.SortOrder
	} else {
		beforeOrder = afterOrder + 2000
	}

	return
}

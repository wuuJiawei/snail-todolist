package service

import (
	"errors"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type ListService struct {
	listRepo *repository.ListRepository
}

func NewListService(listRepo *repository.ListRepository) *ListService {
	return &ListService{listRepo: listRepo}
}

type CreateListInput struct {
	Name      string `json:"name" binding:"required"`
	Icon      string `json:"icon"`
	Color     string `json:"color"`
	SortOrder int    `json:"sort_order"`
}

type UpdateListInput struct {
	Name      *string `json:"name"`
	Icon      *string `json:"icon"`
	Color     *string `json:"color"`
	SortOrder *int    `json:"sort_order"`
}

func (s *ListService) GetLists(userID uuid.UUID) ([]model.List, error) {
	return s.listRepo.FindByUserID(userID)
}

func (s *ListService) CreateList(userID uuid.UUID, input *CreateListInput) (*model.List, error) {
	list := &model.List{
		UserID:    userID,
		Name:      input.Name,
		Icon:      input.Icon,
		Color:     input.Color,
		SortOrder: input.SortOrder,
	}

	if err := s.listRepo.Create(list); err != nil {
		return nil, err
	}

	return list, nil
}

func (s *ListService) UpdateList(userID, listID uuid.UUID, input *UpdateListInput) (*model.List, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, err
	}

	if list.UserID != userID {
		return nil, errors.New("无权操作此清单")
	}

	if input.Name != nil {
		list.Name = *input.Name
	}
	if input.Icon != nil {
		list.Icon = *input.Icon
	}
	if input.Color != nil {
		list.Color = *input.Color
	}
	if input.SortOrder != nil {
		list.SortOrder = *input.SortOrder
	}

	if err := s.listRepo.Update(list); err != nil {
		return nil, err
	}

	return list, nil
}

func (s *ListService) DeleteList(userID, listID uuid.UUID) error {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return err
	}

	if list.UserID != userID {
		return errors.New("无权操作此清单")
	}

	return s.listRepo.Delete(listID)
}

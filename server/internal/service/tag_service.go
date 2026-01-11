package service

import (
	"errors"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type TagService struct {
	tagRepo     *repository.TagRepository
	taskTagRepo *repository.TaskTagRepository
	taskRepo    *repository.TaskRepository
}

func NewTagService(tagRepo *repository.TagRepository, taskTagRepo *repository.TaskTagRepository, taskRepo *repository.TaskRepository) *TagService {
	return &TagService{
		tagRepo:     tagRepo,
		taskTagRepo: taskTagRepo,
		taskRepo:    taskRepo,
	}
}

type CreateTagInput struct {
	Name      string     `json:"name" binding:"required,max=100"`
	ProjectID *uuid.UUID `json:"project_id"`
}

type UpdateTagInput struct {
	Name *string `json:"name" binding:"omitempty,max=100"`
}

func (s *TagService) CreateTag(userID uuid.UUID, input *CreateTagInput) (*model.Tag, error) {
	existing, _ := s.tagRepo.FindByName(userID, input.Name)
	if existing != nil {
		return nil, errors.New("标签已存在")
	}

	tag := &model.Tag{
		Name:      input.Name,
		UserID:    userID,
		ProjectID: input.ProjectID,
	}

	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *TagService) GetTags(userID uuid.UUID, projectID *uuid.UUID) ([]model.Tag, error) {
	if projectID != nil {
		return s.tagRepo.FindByProject(userID, *projectID)
	}
	return s.tagRepo.FindByUser(userID)
}

func (s *TagService) GetTag(userID uuid.UUID, tagID uuid.UUID) (*model.Tag, error) {
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return nil, errors.New("标签不存在")
	}
	if tag.UserID != userID {
		return nil, errors.New("无权访问此标签")
	}
	return tag, nil
}

func (s *TagService) UpdateTag(userID, tagID uuid.UUID, input *UpdateTagInput) (*model.Tag, error) {
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return nil, errors.New("标签不存在")
	}
	if tag.UserID != userID {
		return nil, errors.New("无权操作此标签")
	}

	if input.Name != nil {
		existing, _ := s.tagRepo.FindByName(userID, *input.Name)
		if existing != nil && existing.ID != tagID {
			return nil, errors.New("标签名已存在")
		}
		tag.Name = *input.Name
	}

	if err := s.tagRepo.Update(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *TagService) DeleteTag(userID, tagID uuid.UUID) error {
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return errors.New("标签不存在")
	}
	if tag.UserID != userID {
		return errors.New("无权操作此标签")
	}

	return s.tagRepo.Delete(tagID)
}

func (s *TagService) AttachTagToTask(userID, taskID, tagID uuid.UUID) error {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return errors.New("任务不存在")
	}
	if task.UserID != userID {
		return errors.New("无权操作此任务")
	}

	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return errors.New("标签不存在")
	}
	if tag.UserID != userID {
		return errors.New("无权使用此标签")
	}

	exists, _ := s.taskTagRepo.Exists(taskID, tagID)
	if exists {
		return nil
	}

	return s.taskTagRepo.Attach(taskID, tagID)
}

func (s *TagService) DetachTagFromTask(userID, taskID, tagID uuid.UUID) error {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return errors.New("任务不存在")
	}
	if task.UserID != userID {
		return errors.New("无权操作此任务")
	}

	return s.taskTagRepo.Detach(taskID, tagID)
}

func (s *TagService) GetTaskTags(userID, taskID uuid.UUID) ([]model.Tag, error) {
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.UserID != userID {
		return nil, errors.New("无权访问此任务")
	}

	return s.taskTagRepo.GetTagsByTask(taskID)
}

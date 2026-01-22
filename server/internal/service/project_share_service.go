package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type ProjectShareService struct {
	shareRepo      *repository.ProjectShareRepository
	listRepo       *repository.ListRepository
	listMemberRepo *repository.ListMemberRepository
}

func NewProjectShareService(
	shareRepo *repository.ProjectShareRepository,
	listRepo *repository.ListRepository,
	listMemberRepo *repository.ListMemberRepository,
) *ProjectShareService {
	return &ProjectShareService{
		shareRepo:      shareRepo,
		listRepo:       listRepo,
		listMemberRepo: listMemberRepo,
	}
}

func (s *ProjectShareService) GetOrCreateShare(userID, projectID uuid.UUID) (*model.ProjectShare, error) {
	list, err := s.listRepo.FindByID(projectID)
	if err != nil {
		return nil, errors.New("项目不存在")
	}
	if list.UserID != userID {
		return nil, errors.New("无权操作此项目")
	}

	existing, err := s.shareRepo.FindActiveByProject(projectID)
	if err == nil && existing != nil {
		return existing, nil
	}

	share := &model.ProjectShare{
		ProjectID: projectID,
		CreatedBy: userID,
		IsActive:  true,
		ExpiresAt: time.Now().AddDate(0, 0, 7),
	}

	if err := s.shareRepo.Create(share); err != nil {
		return nil, err
	}

	return share, nil
}

func (s *ProjectShareService) DeactivateShare(userID, projectID uuid.UUID) error {
	list, err := s.listRepo.FindByID(projectID)
	if err != nil {
		return errors.New("项目不存在")
	}
	if list.UserID != userID {
		return errors.New("无权操作此项目")
	}

	return s.shareRepo.DeactivateByProject(projectID)
}

type JoinByCodeInput struct {
	ShareCode string `json:"share_code" binding:"required,len=8"`
}

func (s *ProjectShareService) JoinByCode(userID uuid.UUID, code string) (*model.List, error) {
	share, err := s.shareRepo.FindByCode(code)
	if err != nil {
		return nil, errors.New("分享码无效")
	}

	if !share.IsActive {
		return nil, errors.New("分享链接已失效")
	}

	if time.Now().After(share.ExpiresAt) {
		return nil, errors.New("分享链接已过期")
	}

	list, err := s.listRepo.FindByID(share.ProjectID)
	if err != nil {
		return nil, errors.New("项目不存在")
	}

	if list.UserID == userID {
		return nil, errors.New("不能加入自己的项目")
	}

	existing, _ := s.listMemberRepo.FindByListAndUser(share.ProjectID, userID)
	if existing != nil {
		return nil, errors.New("已是项目成员")
	}

	member := &model.ListMember{
		ListID: share.ProjectID,
		UserID: userID,
		Role:   model.RoleViewer,
	}

	if err := s.listMemberRepo.Create(member); err != nil {
		return nil, err
	}

	return list, nil
}

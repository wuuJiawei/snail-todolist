package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type ListMemberService struct {
	memberRepo *repository.ListMemberRepository
	listRepo   *repository.ListRepository
	userRepo   *repository.UserRepository
}

func NewListMemberService(
	memberRepo *repository.ListMemberRepository,
	listRepo *repository.ListRepository,
	userRepo *repository.UserRepository,
) *ListMemberService {
	return &ListMemberService{
		memberRepo: memberRepo,
		listRepo:   listRepo,
		userRepo:   userRepo,
	}
}

type InviteMemberInput struct {
	Email string           `json:"email" binding:"required,email"`
	Role  model.MemberRole `json:"role" binding:"required,oneof=editor viewer"`
}

type UpdateMemberInput struct {
	Role model.MemberRole `json:"role" binding:"required,oneof=editor viewer"`
}

// InviteMember 邀请成员加入清单
func (s *ListMemberService) InviteMember(ownerID, listID uuid.UUID, input *InviteMemberInput) (*model.ListMember, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, errors.New("清单不存在")
	}
	if list.UserID != ownerID {
		return nil, errors.New("只有清单所有者可以邀请成员")
	}

	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, errors.New("用户不存在")
	}

	if user.ID == ownerID {
		return nil, errors.New("不能邀请自己")
	}

	if s.memberRepo.HasAccess(listID, user.ID) {
		return nil, errors.New("用户已是成员")
	}

	now := time.Now()
	member := &model.ListMember{
		ListID:     listID,
		UserID:     user.ID,
		Role:       input.Role,
		InvitedBy:  ownerID,
		InvitedAt:  now,
		AcceptedAt: &now,
	}

	if err := s.memberRepo.Create(member); err != nil {
		return nil, err
	}

	return member, nil
}

// GetMembers 获取清单成员列表
func (s *ListMemberService) GetMembers(userID, listID uuid.UUID) ([]model.ListMember, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, errors.New("清单不存在")
	}

	if list.UserID != userID && !s.memberRepo.HasAccess(listID, userID) {
		return nil, errors.New("无权访问此清单")
	}

	return s.memberRepo.FindByListID(listID)
}

// UpdateMember 更新成员角色
func (s *ListMemberService) UpdateMember(ownerID, listID, memberID uuid.UUID, input *UpdateMemberInput) (*model.ListMember, error) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return nil, errors.New("清单不存在")
	}
	if list.UserID != ownerID {
		return nil, errors.New("只有清单所有者可以修改成员角色")
	}

	member, err := s.memberRepo.FindByID(memberID)
	if err != nil {
		return nil, errors.New("成员不存在")
	}
	if member.ListID != listID {
		return nil, errors.New("成员不属于此清单")
	}

	member.Role = input.Role
	if err := s.memberRepo.Update(member); err != nil {
		return nil, err
	}

	return member, nil
}

// RemoveMember 移除成员
func (s *ListMemberService) RemoveMember(ownerID, listID, memberID uuid.UUID) error {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return errors.New("清单不存在")
	}
	if list.UserID != ownerID {
		return errors.New("只有清单所有者可以移除成员")
	}

	member, err := s.memberRepo.FindByID(memberID)
	if err != nil {
		return errors.New("成员不存在")
	}
	if member.ListID != listID {
		return errors.New("成员不属于此清单")
	}

	return s.memberRepo.Delete(memberID)
}

// CheckAccess 检查用户对清单的访问权限
func (s *ListMemberService) CheckAccess(listID, userID uuid.UUID) (bool, model.MemberRole) {
	list, err := s.listRepo.FindByID(listID)
	if err != nil {
		return false, ""
	}

	if list.UserID == userID {
		return true, model.RoleOwner
	}

	role, err := s.memberRepo.GetUserRole(listID, userID)
	if err != nil {
		return false, ""
	}

	return true, role
}

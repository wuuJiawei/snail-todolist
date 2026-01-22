package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"snail-server/internal/model"
)

type ListMemberRepository struct {
	db *gorm.DB
}

func NewListMemberRepository(db *gorm.DB) *ListMemberRepository {
	return &ListMemberRepository{db: db}
}

func (r *ListMemberRepository) Create(member *model.ListMember) error {
	return r.db.Create(member).Error
}

func (r *ListMemberRepository) FindByID(id uuid.UUID) (*model.ListMember, error) {
	var member model.ListMember
	err := r.db.First(&member, "id = ?", id).Error
	return &member, err
}

func (r *ListMemberRepository) FindByListAndUser(listID, userID uuid.UUID) (*model.ListMember, error) {
	var member model.ListMember
	err := r.db.First(&member, "list_id = ? AND user_id = ?", listID, userID).Error
	return &member, err
}

func (r *ListMemberRepository) FindByListID(listID uuid.UUID) ([]model.ListMember, error) {
	var members []model.ListMember
	err := r.db.Preload("User").Where("list_id = ?", listID).Find(&members).Error
	return members, err
}

func (r *ListMemberRepository) Update(member *model.ListMember) error {
	return r.db.Save(member).Error
}

func (r *ListMemberRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ListMember{}, "id = ?", id).Error
}

// GetUserRole 获取用户在清单中的角色
func (r *ListMemberRepository) GetUserRole(listID, userID uuid.UUID) (model.MemberRole, error) {
	var member model.ListMember
	err := r.db.Select("role").First(&member, "list_id = ? AND user_id = ?", listID, userID).Error
	if err != nil {
		return "", err
	}
	return member.Role, nil
}

// HasAccess 检查用户是否有访问权限
func (r *ListMemberRepository) HasAccess(listID, userID uuid.UUID) bool {
	var count int64
	r.db.Model(&model.ListMember{}).Where("list_id = ? AND user_id = ?", listID, userID).Count(&count)
	return count > 0
}

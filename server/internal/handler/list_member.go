package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type ListMemberHandler struct {
	memberService *service.ListMemberService
}

func NewListMemberHandler(memberService *service.ListMemberService) *ListMemberHandler {
	return &ListMemberHandler{memberService: memberService}
}

// InviteMember 邀请成员
func (h *ListMemberHandler) InviteMember(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	var input service.InviteMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	member, err := h.memberService.InviteMember(userID, listID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, member)
}

// GetMembers 获取成员列表
func (h *ListMemberHandler) GetMembers(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}

	members, err := h.memberService.GetMembers(userID, listID)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, members)
}

// UpdateMember 更新成员角色
func (h *ListMemberHandler) UpdateMember(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}
	memberID, err := uuid.Parse(c.Param("memberId"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的成员ID")
		return
	}

	var input service.UpdateMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	member, err := h.memberService.UpdateMember(userID, listID, memberID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, member)
}

// RemoveMember 移除成员
func (h *ListMemberHandler) RemoveMember(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	listID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的清单ID")
		return
	}
	memberID, err := uuid.Parse(c.Param("memberId"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的成员ID")
		return
	}

	if err := h.memberService.RemoveMember(userID, listID, memberID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "移除成功"})
}

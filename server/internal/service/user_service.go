package service

import (
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

type UpdateUserInput struct {
	Nickname  string `json:"nickname"`
	Username  string `json:"username"`
	Avatar    string `json:"avatar"`
	AvatarURL string `json:"avatar_url"`
}

type UpdatePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (s *UserService) GetUser(id uuid.UUID) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

func (s *UserService) UpdateUser(id uuid.UUID, input *UpdateUserInput) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if input.Nickname != "" {
		user.Nickname = input.Nickname
	}
	if input.Username != "" {
		user.Nickname = input.Username
	}
	if input.Avatar != "" {
		user.Avatar = input.Avatar
	}
	if input.AvatarURL != "" {
		user.Avatar = input.AvatarURL
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) UpdatePassword(id uuid.UUID, input *UpdatePasswordInput) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}

	if user.Password != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.OldPassword)); err != nil {
			return errors.New("原密码错误")
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hashedPassword)
	return s.userRepo.Update(user)
}

func (s *UserService) UpdateAvatarURL(id uuid.UUID, avatarURL string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}

	user.Avatar = avatarURL
	return s.userRepo.Update(user)
}

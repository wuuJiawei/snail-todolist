package service

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
	"snail-server/internal/model"
	"snail-server/internal/repository"
	"snail-server/pkg/email"
	"snail-server/pkg/jwt"
)

type AuthService struct {
	userRepo      *repository.UserRepository
	emailCodeRepo *repository.EmailCodeRepository
}

func NewAuthService(userRepo *repository.UserRepository, emailCodeRepo *repository.EmailCodeRepository) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		emailCodeRepo: emailCodeRepo,
	}
}

type RegisterInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Nickname string `json:"nickname"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type EmailCodeInput struct {
	Email string `json:"email" binding:"required,email"`
	Type  string `json:"type" binding:"required,oneof=login register"`
}

type EmailLoginInput struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

func (s *AuthService) Register(input *RegisterInput) (*AuthResponse, error) {
	if s.userRepo.ExistsByEmail(input.Email) {
		return nil, errors.New("邮箱已被注册")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Email:    input.Email,
		Password: string(hashedPassword),
		Nickname: input.Nickname,
	}

	if user.Nickname == "" {
		user.Nickname = input.Email
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	token, err := jwt.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) Login(input *LoginInput) (*AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, errors.New("邮箱或密码错误")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("邮箱或密码错误")
	}

	token, err := jwt.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) SendEmailCode(input *EmailCodeInput) error {
	if input.Type == "register" && s.userRepo.ExistsByEmail(input.Email) {
		return errors.New("邮箱已被注册")
	}

	code := generateCode()
	emailCode := &model.EmailCode{
		Email:     input.Email,
		Code:      code,
		Type:      input.Type,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	if err := s.emailCodeRepo.Create(emailCode); err != nil {
		return err
	}

	return email.SendVerificationCode(input.Email, code, input.Type)
}

func (s *AuthService) EmailLogin(input *EmailLoginInput) (*AuthResponse, error) {
	emailCode, err := s.emailCodeRepo.FindValidCode(input.Email, input.Code, "login")
	if err != nil {
		return nil, errors.New("验证码无效或已过期")
	}

	s.emailCodeRepo.MarkUsed(emailCode.ID)

	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		user = &model.User{
			Email:    input.Email,
			Nickname: input.Email,
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, err
		}
	}

	token, err := jwt.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func generateCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

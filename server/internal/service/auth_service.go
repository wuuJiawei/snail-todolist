package service

import (
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"snail-server/internal/model"
	"snail-server/internal/repository"
	"snail-server/pkg/email"
	"snail-server/pkg/jwt"
)

type AuthService struct {
	userRepo       *repository.UserRepository
	emailCodeRepo  *repository.EmailCodeRepository
	settingService *SystemSettingService
}

func NewAuthService(userRepo *repository.UserRepository, emailCodeRepo *repository.EmailCodeRepository, settingService *SystemSettingService) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		emailCodeRepo:  emailCodeRepo,
		settingService: settingService,
	}
}

type RegisterInput struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
}

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type EmailCodeInput struct {
	Email string `json:"email" binding:"required,email"`
}

type EmailLoginInput struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

type AuthConfigResponse struct {
	EmailLoginEnabled bool `json:"email_login_enabled"`
}

// 用户名验证正则：只允许字母、数字、下划线
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

func (s *AuthService) Register(input *RegisterInput) (*AuthResponse, error) {
	// 验证用户名格式
	if !usernameRegex.MatchString(input.Username) {
		return nil, errors.New("用户名只能包含字母、数字和下划线")
	}

	// 检查用户名是否已存在
	if s.userRepo.ExistsByUsername(input.Username) {
		return nil, errors.New("用户名已被使用")
	}

	// 如果提供了邮箱，检查邮箱是否已存在
	if input.Email != "" && s.userRepo.ExistsByEmail(input.Email) {
		return nil, errors.New("邮箱已被注册")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username: input.Username,
		Email:    input.Email,
		Password: string(hashedPassword),
		Nickname: input.Nickname,
	}

	if user.Nickname == "" {
		user.Nickname = input.Username
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	token, err := jwt.GenerateToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) Login(input *LoginInput) (*AuthResponse, error) {
	var user *model.User
	var err error

	// 支持用户名或邮箱登录
	if strings.Contains(input.Username, "@") {
		user, err = s.userRepo.FindByEmail(input.Username)
	} else {
		user, err = s.userRepo.FindByUsername(input.Username)
	}

	if err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	token, err := jwt.GenerateToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) SendEmailCode(input *EmailCodeInput) error {
	if !s.settingService.IsEmailLoginEnabled() {
		return errors.New("邮箱登录功能未启用")
	}

	code := generateCode()
	emailCode := &model.EmailCode{
		Email:     input.Email,
		Code:      code,
		Type:      "login",
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	if err := s.emailCodeRepo.Create(emailCode); err != nil {
		return err
	}

	return email.SendVerificationCode(input.Email, code, "login")
}

func (s *AuthService) EmailLogin(input *EmailLoginInput) (*AuthResponse, error) {
	if !s.settingService.IsEmailLoginEnabled() {
		return nil, errors.New("邮箱登录功能未启用")
	}

	emailCode, err := s.emailCodeRepo.FindValidCode(input.Email, input.Code, "login")
	if err != nil {
		return nil, errors.New("验证码无效或已过期")
	}

	s.emailCodeRepo.MarkUsed(emailCode.ID)

	// 查找或创建用户
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		// 用户不存在，自动创建
		// 从邮箱生成用户名
		username := generateUsernameFromEmail(input.Email)
		// 确保用户名唯一
		for s.userRepo.ExistsByUsername(username) {
			username = username + fmt.Sprintf("%d", rand.Intn(1000))
		}

		user = &model.User{
			Email:    input.Email,
			Username: username,
			Nickname: input.Email,
		}
		if err := s.userRepo.Create(user); err != nil {
			return nil, err
		}
	}

	token, err := jwt.GenerateToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) GetAuthConfig() *AuthConfigResponse {
	return &AuthConfigResponse{
		EmailLoginEnabled: s.settingService.IsEmailLoginEnabled(),
	}
}

func generateCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

func generateUsernameFromEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) > 0 {
		// 只保留字母数字下划线
		username := usernameRegex.ReplaceAllString(parts[0], "")
		if username == "" {
			username = "user"
		}
		return username
	}
	return "user"
}

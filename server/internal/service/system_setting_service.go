package service

import (
	"strconv"

	"snail-server/internal/model"
	"snail-server/internal/repository"
	"snail-server/pkg/email"
)

type SystemSettingService struct {
	repo *repository.SystemSettingRepository
}

func NewSystemSettingService(repo *repository.SystemSettingRepository) *SystemSettingService {
	return &SystemSettingService{repo: repo}
}

type SMTPConfig struct {
	Host              string `json:"smtp_host"`
	Port              int    `json:"smtp_port"`
	User              string `json:"smtp_user"`
	Password          string `json:"smtp_password"`
	From              string `json:"smtp_from"`
	EmailLoginEnabled bool   `json:"email_login_enabled"`
}

func (s *SystemSettingService) GetSMTPConfig() (*SMTPConfig, error) {
	keys := []string{
		model.SettingSMTPHost,
		model.SettingSMTPPort,
		model.SettingSMTPUser,
		model.SettingSMTPPassword,
		model.SettingSMTPFrom,
		model.SettingEmailLoginEnabled,
	}
	data, err := s.repo.GetMultiple(keys)
	if err != nil {
		return nil, err
	}

	port, _ := strconv.Atoi(data[model.SettingSMTPPort])
	if port == 0 {
		port = 587
	}

	return &SMTPConfig{
		Host:              data[model.SettingSMTPHost],
		Port:              port,
		User:              data[model.SettingSMTPUser],
		Password:          data[model.SettingSMTPPassword],
		From:              data[model.SettingSMTPFrom],
		EmailLoginEnabled: data[model.SettingEmailLoginEnabled] == "true",
	}, nil
}

func (s *SystemSettingService) UpdateSMTPConfig(cfg *SMTPConfig) error {
	data := map[string]string{
		model.SettingSMTPHost:          cfg.Host,
		model.SettingSMTPPort:          strconv.Itoa(cfg.Port),
		model.SettingSMTPUser:          cfg.User,
		model.SettingSMTPFrom:          cfg.From,
		model.SettingEmailLoginEnabled: strconv.FormatBool(cfg.EmailLoginEnabled),
	}
	if cfg.Password != "" {
		data[model.SettingSMTPPassword] = cfg.Password
	}

	if err := s.repo.SetMultiple(data); err != nil {
		return err
	}

	s.reloadEmailConfig()
	return nil
}

func (s *SystemSettingService) IsEmailLoginEnabled() bool {
	cfg, err := s.GetSMTPConfig()
	if err != nil {
		return false
	}
	return cfg.EmailLoginEnabled && cfg.Host != "" && cfg.User != ""
}

func (s *SystemSettingService) reloadEmailConfig() {
	cfg, err := s.GetSMTPConfig()
	if err != nil {
		return
	}
	email.Init(&email.SMTPConfig{
		Host:     cfg.Host,
		Port:     cfg.Port,
		User:     cfg.User,
		Password: cfg.Password,
		From:     cfg.From,
	})
}

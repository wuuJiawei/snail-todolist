package service

import (
	"strconv"
	"strings"

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


type AppInfoConfig struct {
	AppName         string   `json:"app_name"`
	AppDescription  string   `json:"app_description"`
	AppLogoURL      string   `json:"app_logo_url"`
	DeveloperName   string   `json:"developer_name"`
	ContactEmail    string   `json:"contact_email"`
	ContactWebsite  string   `json:"contact_website"`
	Features        []string `json:"features"`
}

func (s *SystemSettingService) GetAppInfo() *AppInfoConfig {
	keys := []string{
		model.SettingAppName,
		model.SettingAppDescription,
		model.SettingAppLogoURL,
		model.SettingDeveloperName,
		model.SettingContactEmail,
		model.SettingContactWebsite,
		model.SettingAppFeatures,
	}
	data, err := s.repo.GetMultiple(keys)
	if err != nil {
		data = make(map[string]string)
	}

	features := []string{}
	if data[model.SettingAppFeatures] != "" {
		for _, f := range strings.Split(data[model.SettingAppFeatures], "\n") {
			if f = strings.TrimSpace(f); f != "" {
				features = append(features, f)
			}
		}
	}

	return &AppInfoConfig{
		AppName:        data[model.SettingAppName],
		AppDescription: data[model.SettingAppDescription],
		AppLogoURL:     data[model.SettingAppLogoURL],
		DeveloperName:  data[model.SettingDeveloperName],
		ContactEmail:   data[model.SettingContactEmail],
		ContactWebsite: data[model.SettingContactWebsite],
		Features:       features,
	}
}

func (s *SystemSettingService) UpdateAppInfo(cfg *AppInfoConfig) error {
	data := map[string]string{
		model.SettingAppName:        cfg.AppName,
		model.SettingAppDescription: cfg.AppDescription,
		model.SettingAppLogoURL:     cfg.AppLogoURL,
		model.SettingDeveloperName:  cfg.DeveloperName,
		model.SettingContactEmail:   cfg.ContactEmail,
		model.SettingContactWebsite: cfg.ContactWebsite,
		model.SettingAppFeatures:    strings.Join(cfg.Features, "\n"),
	}
	return s.repo.SetMultiple(data)
}

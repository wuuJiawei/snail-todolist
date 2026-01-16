package model

import (
	"time"
)

type SystemSetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const (
	SettingSMTPHost           = "smtp_host"
	SettingSMTPPort           = "smtp_port"
	SettingSMTPUser           = "smtp_user"
	SettingSMTPPassword       = "smtp_password"
	SettingSMTPFrom           = "smtp_from"
	SettingEmailLoginEnabled  = "email_login_enabled"
	SettingAppName            = "app_name"
	SettingAppDescription     = "app_description"
	SettingAppLogoURL         = "app_logo_url"
	SettingDeveloperName      = "developer_name"
	SettingContactEmail       = "contact_email"
	SettingContactWebsite     = "contact_website"
	SettingAppFeatures        = "app_features"
)

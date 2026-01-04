package email

import (
	"fmt"
	"net/smtp"
)

type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

var config *SMTPConfig

func Init(cfg *SMTPConfig) {
	config = cfg
}

func SendVerificationCode(to, code, codeType string) error {
	if config == nil || config.Host == "" {
		return fmt.Errorf("SMTP not configured")
	}

	subject := "验证码"
	if codeType == "register" {
		subject = "注册验证码"
	} else if codeType == "login" {
		subject = "登录验证码"
	}

	body := fmt.Sprintf(`
您的验证码是: %s

验证码有效期为 10 分钟，请勿泄露给他人。

如果这不是您的操作，请忽略此邮件。
`, code)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		config.From, to, subject, body)

	auth := smtp.PlainAuth("", config.User, config.Password, config.Host)
	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	return smtp.SendMail(addr, auth, config.From, []string{to}, []byte(msg))
}

package mailer

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"net/url"
	"strings"
	"time"
)

// Config holds the SMTP settings used for identity emails.
type Config struct {
	Host            string
	Port            string
	User            string
	Password        string
	From            string
	AppURL          string
	VerificationTTL time.Duration
	ResetTTL        time.Duration
}

// Enabled reports whether enough settings exist to deliver email.
func (c Config) Enabled() bool {
	return strings.TrimSpace(c.Host) != "" && strings.TrimSpace(c.From) != ""
}

// VerificationLink builds the public link consumed by the Angular verification screen.
func (c Config) VerificationLink(token string) string {
	return strings.TrimRight(c.AppURL, "/") + "/verificar-email?token=" + urlQueryEscape(token)
}

// ResetLink builds the public link consumed by the Angular password reset screen.
func (c Config) ResetLink(token string) string {
	return strings.TrimRight(c.AppURL, "/") + "/redefinir-password?token=" + urlQueryEscape(token)
}

// Send delivers a multipart text/HTML message using SMTP with STARTTLS when available.
func (c Config) Send(to, subject, textBody, htmlBody string) error {
	if !c.Enabled() {
		return errors.New("SMTP não está configurado")
	}
	from, err := mail.ParseAddress(c.From)
	if err != nil {
		return fmt.Errorf("endereço remetente inválido: %w", err)
	}
	recipient, err := mail.ParseAddress(to)
	if err != nil {
		return fmt.Errorf("endereço destinatário inválido: %w", err)
	}

	boundary := fmt.Sprintf("sinala_%d", time.Now().UnixNano())
	var message bytes.Buffer
	fmt.Fprintf(&message, "From: %s\r\nTo: %s\r\nSubject: %s\r\n", mime.QEncoding.Encode("utf-8", from.String()), recipient.Address, mime.QEncoding.Encode("utf-8", subject))
	message.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&message, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)
	fmt.Fprintf(&message, "--%s\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n%s\r\n", boundary, base64Line(textBody))
	fmt.Fprintf(&message, "--%s\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n%s\r\n", boundary, base64Line(htmlBody))
	fmt.Fprintf(&message, "--%s--\r\n", boundary)

	port := c.Port
	if port == "" {
		port = "587"
	}
	address := net.JoinHostPort(c.Host, port)
	var auth smtp.Auth
	if c.User != "" {
		auth = smtp.PlainAuth("", c.User, c.Password, c.Host)
	}
	if port == "465" {
		return sendImplicitTLS(address, c.Host, auth, from.Address, recipient.Address, message.Bytes())
	}
	return smtp.SendMail(address, auth, from.Address, []string{recipient.Address}, message.Bytes())
}

func sendImplicitTLS(address, host string, auth smtp.Auth, from, to string, message []byte) error {
	connection, err := tls.Dial("tcp", address, &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(connection, host)
	if err != nil {
		_ = connection.Close()
		return err
	}
	defer client.Close()
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func base64Line(value string) string {
	encoded := base64.StdEncoding.EncodeToString([]byte(value))
	var result strings.Builder
	for len(encoded) > 76 {
		result.WriteString(encoded[:76])
		result.WriteString("\r\n")
		encoded = encoded[76:]
	}
	result.WriteString(encoded)
	return result.String()
}

func urlQueryEscape(value string) string {
	return url.QueryEscape(value)
}

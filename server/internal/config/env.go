package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnvironment() error {
	err := godotenv.Load()
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

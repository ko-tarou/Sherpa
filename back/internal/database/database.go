package database

import (
	"fmt"
	"log"
	"os"

	"sherpa-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect データベースに接続
func Connect() error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSLMODE"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

// AutoMigrate データベースのマイグレーションを実行
func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Organization{},
		&models.OrganizationMember{},
		&models.Event{},
		&models.EventStaff{},
		&models.Task{},
		&models.Budget{},
		&models.Meeting{},
		&models.Ticket{},
		&models.EventParticipant{},
		&models.Channel{},
		&models.ChannelMember{},
		&models.Message{},
	)

	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// Close データベース接続を閉じる
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

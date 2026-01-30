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
	dbHost := os.Getenv("DB_HOST")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbPort := os.Getenv("DB_PORT")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	// デフォルト値の設定
	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbUser == "" {
		dbUser = "kota"
	}
	if dbName == "" {
		dbName = "sherpa"
	}
	if dbPort == "" {
		dbPort = "5432"
	}
	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	// デバッグ用ログ
	log.Printf("Connecting to database: host=%s user=%s dbname=%s port=%s", dbHost, dbUser, dbName, dbPort)

	// DSN構築（パスワードが空の場合も正しく処理）
	var dsn string
	if dbPassword != "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			dbHost, dbUser, dbPassword, dbName, dbPort, dbSSLMode,
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s user=%s dbname=%s port=%s sslmode=%s",
			dbHost, dbUser, dbName, dbPort, dbSSLMode,
		)
	}
	
	log.Printf("DSN: %s", dsn)

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
		&models.EventInvitation{},
		&models.Notification{},
		&models.Task{},
		&models.Budget{},
		&models.Meeting{},
		&models.Ticket{},
		&models.EventParticipant{},
		&models.Channel{},
		&models.ChannelMember{},
		&models.Message{},
		&models.MessageReaction{},
	)

	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// EnsureDefaultOrganization デフォルト組織がなければ作成
func EnsureDefaultOrganization() error {
	var count int64
	if err := DB.Model(&models.Organization{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	desc := "デフォルト組織"
	org := models.Organization{Name: "My Organization", Description: &desc}
	if err := DB.Create(&org).Error; err != nil {
		return err
	}
	log.Println("Created default organization:", org.Name)
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

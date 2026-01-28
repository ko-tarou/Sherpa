package main

import (
	"log"
	"os"

	"sherpa-backend/internal/batch"
	"sherpa-backend/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	if _, err := batch.Run(); err != nil {
		log.Fatal("Batch failed:", err)
	}

	log.Println("[batch] Exit 0")
	os.Exit(0)
}

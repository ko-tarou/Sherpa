package main

import (
	"log"
	"os"

	"sherpa-backend/internal/database"

	"sherpa-backend/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 環境変数の読み込み
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// データベース接続
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// マイグレーション実行
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	// デフォルト組織を確保
	if err := database.EnsureDefaultOrganization(); err != nil {
		log.Fatal("Failed to ensure default organization:", err)
	}

	// Ginルーターの設定
	env := os.Getenv("ENV")
	if env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS設定
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// ヘルスチェック
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Sherpa Backend API is running",
		})
	})

	// APIルート
	api := r.Group("/api")
	{
		// タスク関連（より具体的なルートを先に定義）
		api.GET("/events/:id/tasks", handlers.GetTasks)
		api.POST("/events/:id/tasks", handlers.CreateTask)
		api.PUT("/tasks/:id", handlers.UpdateTask)
		api.DELETE("/tasks/:id", handlers.DeleteTask)
		api.POST("/tasks/generate", handlers.GenerateTasks)

		// イベント関連
		api.GET("/events", handlers.GetEvents)
		api.GET("/events/:id", handlers.GetEvent)
		api.POST("/events", handlers.CreateEvent)
		api.PUT("/events/:id", handlers.UpdateEvent)
		api.DELETE("/events/:id", handlers.DeleteEvent)
		api.POST("/events/create-chat", handlers.CreateEventChat)

		// 予算関連
		api.GET("/events/:id/budgets", handlers.GetBudgets)
		api.POST("/events/:id/budgets", handlers.CreateBudget)
		api.PUT("/budgets/:id", handlers.UpdateBudget)
		api.DELETE("/budgets/:id", handlers.DeleteBudget)

		// 認証関連
		api.GET("/auth/google", handlers.StartOAuth)
		api.GET("/auth/callback", handlers.OAuthCallback)
		api.GET("/auth/me", handlers.AuthMiddleware(), handlers.GetMe)

		// ユーザー関連（search は :id より先に定義）
		api.POST("/users", handlers.CreateUser)
		api.GET("/users/search", handlers.AuthMiddleware(), handlers.SearchUsers)
		api.GET("/users/:id/events", handlers.GetUserEvents)
		api.GET("/users/:id", handlers.GetUser)

		// 招待・通知（認証必須）
		auth := api.Group("")
		auth.Use(handlers.AuthMiddleware())
		auth.GET("/events/:id/invitable-users", handlers.GetInvitableUsers)
		auth.GET("/events/:id/invitations", handlers.GetEventInvitations)
		auth.POST("/events/:id/invitations", handlers.CreateInvitation)
		auth.POST("/invitations/:id/accept", handlers.AcceptInvitation)
		auth.POST("/invitations/:id/decline", handlers.DeclineInvitation)
		auth.GET("/notifications", handlers.GetNotifications)
		auth.GET("/notifications/unread-count", handlers.GetUnreadNotificationCount)
		auth.PATCH("/notifications/:id/read", handlers.MarkNotificationRead)
		auth.GET("/invitations/mine", handlers.GetMyPendingInvitations)
	}

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("🚀 Server is running on http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

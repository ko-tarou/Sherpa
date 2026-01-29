package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	oauthConfig *oauth2.Config
	jwtSecret   []byte
)


func ensureJWTSecret() {
	if len(jwtSecret) > 0 {
		return
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = generateRandomSecret()
	}
	jwtSecret = []byte(secret)
}

// ensureOAuthConfig は .env 読込後によび出す。main の godotenv.Load のあとで初回リクエスト時に初期化される。
func ensureOAuthConfig() {
	if oauthConfig != nil {
		return
	}
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:3001/api/auth/callback"
	}
	if clientID != "" && clientSecret != "" {
		oauthConfig = &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"openid", "profile", "email"},
			Endpoint:     google.Endpoint,
		}
	}
}

func generateRandomSecret() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// GoogleUserInfo Google OAuthから取得したユーザー情報
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// StartOAuth Google OAuth認証を開始。Cookie をセットして Google へリダイレクトする。
// フロントは /api/auth/google へリダイレクトすること（fetch 不可・cross-origin で Cookie が渡らないため）。
func StartOAuth(c *gin.Context) {
	ensureOAuthConfig()
	if oauthConfig == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in back/.env. See back/README.md for Google OAuth setup.",
		})
		return
	}

	state := generateStateToken()
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)

	url := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusFound, url)
}

// OAuthCallback OAuth認証のコールバック
func OAuthCallback(c *gin.Context) {
	ensureOAuthConfig()
	if oauthConfig == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "OAuth is not configured"})
		return
	}

	code := c.Query("code")
	state := c.Query("state")

	storedState, err := c.Cookie("oauth_state")
	if err != nil || state != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	token, err := oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to exchange token: " + err.Error()})
		return
	}

	client := oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read user info"})
		return
	}

	var googleUser GoogleUserInfo
	if err := json.Unmarshal(body, &googleUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
		return
	}

	user, err := getOrCreateUser(googleUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	jwtToken, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	redirectURL := os.Getenv("FRONTEND_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173"
	}
	redirectURL = strings.TrimSuffix(redirectURL, "/")

	c.Redirect(http.StatusFound, redirectURL+"/auth/callback?token="+url.QueryEscape(jwtToken))
}

func generateStateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func getOrCreateUser(googleUser GoogleUserInfo) (*models.User, error) {
	var user models.User
	err := database.DB.Where("email = ?", googleUser.Email).First(&user).Error

	if err != nil {
		user = models.User{
			Name:      googleUser.Name,
			Email:     googleUser.Email,
			AvatarURL: &googleUser.Picture,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			return nil, err
		}

		member := models.OrganizationMember{
			UserID:         user.ID,
			OrganizationID: defaultOrgID,
			Role:           "member",
		}
		if err := database.DB.Create(&member).Error; err != nil {
			return nil, err
		}
	} else {
		if googleUser.Picture != "" && (user.AvatarURL == nil || *user.AvatarURL != googleUser.Picture) {
			user.AvatarURL = &googleUser.Picture
			database.DB.Save(&user)
		}
	}

	return &user, nil
}

func generateJWT(userID uint) (string, error) {
	ensureJWTSecret()
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// VerifyToken JWTトークンを検証してユーザーIDを取得
func VerifyToken(tokenString string) (uint, error) {
	ensureJWTSecret()
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, ok := claims["user_id"].(float64)
		if !ok {
			return 0, fmt.Errorf("invalid user_id in token")
		}
		return uint(userID), nil
	}

	return 0, fmt.Errorf("invalid token")
}

// AuthMiddleware 認証ミドルウェア
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		userID, err := VerifyToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}

// GetMe 現在のユーザー情報を取得
func GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func userIDFrom(c *gin.Context) (uint, bool) {
	v, ok := c.Get("user_id")
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}

// GetInvitableUsers 同一組織内で未参加・未招待のユーザー一覧（Admin用）
func GetInvitableUsers(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.Event
	if err := database.DB.First(&event, uint(eventID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	var admin models.EventStaff
	if err := database.DB.Where("event_id = ? AND user_id = ? AND role = ?", eventID, uid, "Admin").First(&admin).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can invite"})
		return
	}
	orgID := event.OrganizationID

	// 招待可能: 同じ組織メンバー, 既にスタッフでない, 自分以外, pending招待もなし
	var staffIDs []uint
	database.DB.Model(&models.EventStaff{}).Where("event_id = ?", eventID).Pluck("user_id", &staffIDs)
	var invitedIDs []uint
	database.DB.Model(&models.EventInvitation{}).Where("event_id = ? AND status = ?", eventID, models.InvitationStatusPending).Pluck("user_id", &invitedIDs)

	exclude := make(map[uint]bool)
	for _, id := range staffIDs {
		exclude[id] = true
	}
	for _, id := range invitedIDs {
		exclude[id] = true
	}
	exclude[uid] = true

	var members []models.OrganizationMember
	if err := database.DB.Where("organization_id = ?", orgID).Preload("User").Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var users []models.User
	for _, m := range members {
		if exclude[m.UserID] {
			continue
		}
		users = append(users, m.User)
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

type createInviteRequest struct {
	UserID *uint  `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role" binding:"required"`
}

// CreateInvitation 招待を作成し、通知を送る。user_id または email のどちらかを指定。
func CreateInvitation(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var req createInviteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var targetUserID uint
	if req.UserID != nil {
		targetUserID = *req.UserID
	} else if req.Email != "" {
		var u models.User
		if err := database.DB.Where("email = ?", strings.TrimSpace(req.Email)).First(&u).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "このメールアドレスのユーザーが見つかりません"})
			return
		}
		targetUserID = u.ID
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id または email を指定してください"})
		return
	}

	var event models.Event
	if err := database.DB.First(&event, uint(eventID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// 招待者はイベントのAdminであること
	var staff models.EventStaff
	if err := database.DB.Where("event_id = ? AND user_id = ? AND role = ?", eventID, uid, "Admin").First(&staff).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can invite members"})
		return
	}

	// 既にスタッフ or 重複pendingは弾く
	var exist models.EventStaff
	if database.DB.Where("event_id = ? AND user_id = ?", eventID, targetUserID).First(&exist).Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーは既にイベントのスタッフです"})
		return
	}
	var dup models.EventInvitation
	if database.DB.Where("event_id = ? AND user_id = ? AND status = ?", eventID, targetUserID, models.InvitationStatusPending).First(&dup).Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "既に招待を送信しています"})
		return
	}

	inv := models.EventInvitation{
		EventID:   uint(eventID),
		InviterID: uid,
		UserID:    targetUserID,
		Role:      req.Role,
		Status:    models.InvitationStatusPending,
	}
	if err := database.DB.Create(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("User").Preload("Inviter").First(&inv, inv.ID)

	// 通知作成
	var inviter models.User
	database.DB.First(&inviter, uid)
	title := "イベントへの招待"
	body := inviter.Name + " さんから「" + event.Title + "」への招待が届きました。"
	n := models.Notification{
		UserID:     targetUserID,
		Type:       models.NotificationTypeEventInvite,
		Title:      title,
		Body:       body,
		RelatedID:  inv.ID,
		RelatedTyp: "event_invitation",
	}
	if err := database.DB.Create(&n).Error; err != nil {
		// 招待は成立しているのでログだけ
	}

	c.JSON(http.StatusCreated, gin.H{"invitation": inv})
}

// GetEventInvitations イベントの招待一覧（Admin用）
func GetEventInvitations(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var staff models.EventStaff
	if err := database.DB.Where("event_id = ? AND user_id = ? AND role = ?", eventID, uid, "Admin").First(&staff).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only event admins can list invitations"})
		return
	}

	var list []models.EventInvitation
	if err := database.DB.Where("event_id = ?", eventID).Preload("User").Preload("Inviter").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invitations": list})
}

// AcceptInvitation 招待を承諾 → EventStaff 追加
func AcceptInvitation(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invitation ID"})
		return
	}

	var inv models.EventInvitation
	if err := database.DB.First(&inv, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}
	if inv.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not your invitation"})
		return
	}
	if inv.Status != models.InvitationStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invitation already handled"})
		return
	}

	inv.Status = models.InvitationStatusAccepted
	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	staff := models.EventStaff{EventID: inv.EventID, UserID: inv.UserID, Role: inv.Role}
	if err := database.DB.Create(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 関連通知を既読に
	database.DB.Exec("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND related_type = ? AND related_id = ?", uid, "event_invitation", inv.ID)

	c.JSON(http.StatusOK, gin.H{"invitation": inv, "event_staff": staff})
}

// DeclineInvitation 招待を辞退
func DeclineInvitation(c *gin.Context) {
	uid, ok := userIDFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invitation ID"})
		return
	}

	var inv models.EventInvitation
	if err := database.DB.First(&inv, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invitation not found"})
		return
	}
	if inv.UserID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not your invitation"})
		return
	}
	if inv.Status != models.InvitationStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invitation already handled"})
		return
	}

	inv.Status = models.InvitationStatusDeclined
	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Exec("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND related_type = ? AND related_id = ?", uid, "event_invitation", inv.ID)

	c.JSON(http.StatusOK, gin.H{"invitation": inv})
}

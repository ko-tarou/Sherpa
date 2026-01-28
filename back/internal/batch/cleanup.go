package batch

import (
	"log"

	"sherpa-backend/internal/database"
	"sherpa-backend/internal/models"
)

// CleanupResult バッチ処理の結果
type CleanupResult struct {
	ChannelsDeleted int64
	EventsDeleted   int64
}

// CleanupSoftDeleted 論理削除済みのチャンネルを物理削除する。
// FK 制約のため、先に messages・channel_members を削除してから channels を削除する。
func CleanupSoftDeleted() (*CleanupResult, error) {
	result := &CleanupResult{}

	// 論理削除済みチャンネルID一覧
	var ids []uint
	if err := database.DB.Unscoped().Model(&models.Channel{}).
		Where("deleted_at IS NOT NULL").Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return result, nil
	}

	// 1. スレッド返信（parent_message_id あり）を先に物理削除
	if err := database.DB.Unscoped().Where("channel_id IN ? AND parent_message_id IS NOT NULL", ids).
		Delete(&models.Message{}).Error; err != nil {
		return nil, err
	}
	// 2. 親メッセージを物理削除
	if err := database.DB.Unscoped().Where("channel_id IN ?", ids).
		Delete(&models.Message{}).Error; err != nil {
		return nil, err
	}
	// 3. チャンネルメンバーを物理削除
	if err := database.DB.Unscoped().Where("channel_id IN ?", ids).
		Delete(&models.ChannelMember{}).Error; err != nil {
		return nil, err
	}
	// 4. チャンネルを物理削除
	tx := database.DB.Unscoped().Where("deleted_at IS NOT NULL").Delete(&models.Channel{})
	if tx.Error != nil {
		return nil, tx.Error
	}
	result.ChannelsDeleted = tx.RowsAffected

	return result, nil
}

// CleanupMemberLessEvents メンバー（EventStaff）が0人のイベントを物理削除する。
// FK のため、関連する channels/messages/tasks/budgets 等を先に削除する。
func CleanupMemberLessEvents() (*CleanupResult, error) {
	result := &CleanupResult{}

	// スタッフが0人のイベントID（論理削除済みは除外）
	var ids []uint
	if err := database.DB.Model(&models.Event{}).
		Where("deleted_at IS NULL AND id NOT IN (SELECT event_id FROM event_staffs WHERE deleted_at IS NULL)").
		Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return result, nil
	}

	// 対象イベントのチャンネルID（論理削除含む）
	var chIds []uint
	if err := database.DB.Unscoped().Model(&models.Channel{}).Where("event_id IN ?", ids).Pluck("id", &chIds).Error; err != nil {
		return nil, err
	}
	if len(chIds) > 0 {
		_ = database.DB.Unscoped().Where("channel_id IN ? AND parent_message_id IS NOT NULL", chIds).Delete(&models.Message{}).Error
		_ = database.DB.Unscoped().Where("channel_id IN ?", chIds).Delete(&models.Message{}).Error
		_ = database.DB.Unscoped().Where("channel_id IN ?", chIds).Delete(&models.ChannelMember{}).Error
		_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.Channel{}).Error
	}

	// チケット→参加者（Ticket 参照）の順で削除（論理削除含む）
	var ticketIds []uint
	_ = database.DB.Unscoped().Model(&models.Ticket{}).Where("event_id IN ?", ids).Pluck("id", &ticketIds).Error
	if len(ticketIds) > 0 {
		_ = database.DB.Unscoped().Where("ticket_id IN ?", ticketIds).Delete(&models.EventParticipant{}).Error
	}
	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.Ticket{}).Error

	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.Task{}).Error
	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.Budget{}).Error
	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.EventInvitation{}).Error
	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.Meeting{}).Error
	_ = database.DB.Unscoped().Where("event_id IN ?", ids).Delete(&models.EventStaff{}).Error

	tx := database.DB.Unscoped().Where("id IN ?", ids).Delete(&models.Event{})
	if tx.Error != nil {
		return nil, tx.Error
	}
	result.EventsDeleted = tx.RowsAffected
	return result, nil
}

// Run 週次バッチのエントリポイント。論理削除済みチャンネル・メンバー0イベントの物理削除。
func Run() (*CleanupResult, error) {
	log.Println("[batch] CleanupSoftDeleted: start")
	res1, err := CleanupSoftDeleted()
	if err != nil {
		return nil, err
	}
	log.Printf("[batch] CleanupSoftDeleted: done channels=%d", res1.ChannelsDeleted)

	log.Println("[batch] CleanupMemberLessEvents: start")
	res2, err := CleanupMemberLessEvents()
	if err != nil {
		return nil, err
	}
	log.Printf("[batch] CleanupMemberLessEvents: done events=%d", res2.EventsDeleted)

	return &CleanupResult{
		ChannelsDeleted: res1.ChannelsDeleted,
		EventsDeleted:   res2.EventsDeleted,
	}, nil
}

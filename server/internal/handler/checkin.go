package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type CheckInHandler struct {
	checkInService *service.CheckInService
}

func NewCheckInHandler(checkInService *service.CheckInService) *CheckInHandler {
	return &CheckInHandler{checkInService: checkInService}
}

type CreateCheckInRequest struct {
	Note *string `json:"note"`
}

type CheckInHistoryResponse struct {
	Records []model.CheckInRecord `json:"records"`
	Total   int64                 `json:"total"`
}

type CheckInTodayResponse struct {
	CheckedIn bool `json:"checked_in"`
}

type CheckInStreakResponse struct {
	Streak int `json:"streak"`
}

func (h *CheckInHandler) CreateCheckIn(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var req CreateCheckInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.Error(c, model.CodeParamError, "Invalid request body")
		return
	}

	record, err := h.checkInService.CreateCheckIn(userID, req.Note)
	if err != nil {
		if err.Error() == "already checked in today" {
			model.Error(c, model.CodeParamError, "今天已经打过卡了")
			return
		}
		model.Error(c, model.CodeInternalError, "Failed to create check-in record")
		return
	}

	model.Success(c, record)
}

func (h *CheckInHandler) GetCheckInHistory(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "365"))

	records, total, err := h.checkInService.GetHistory(userID, page, pageSize)
	if err != nil {
		model.Error(c, model.CodeInternalError, "Failed to fetch records")
		return
	}

	model.Success(c, CheckInHistoryResponse{
		Records: records,
		Total:   total,
	})
}

func (h *CheckInHandler) GetCheckInStreak(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	streak, err := h.checkInService.GetStreak(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, "Failed to calculate streak")
		return
	}

	model.Success(c, CheckInStreakResponse{
		Streak: streak,
	})
}

func (h *CheckInHandler) HasCheckedInToday(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	hasCheckedIn, err := h.checkInService.HasCheckedInToday(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, "Database error")
		return
	}

	model.Success(c, CheckInTodayResponse{
		CheckedIn: hasCheckedIn,
	})
}

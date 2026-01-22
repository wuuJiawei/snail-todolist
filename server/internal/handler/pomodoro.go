package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/service"
)

type PomodoroHandler struct {
	pomodoroService *service.PomodoroService
}

func NewPomodoroHandler(pomodoroService *service.PomodoroService) *PomodoroHandler {
	return &PomodoroHandler{pomodoroService: pomodoroService}
}

func (h *PomodoroHandler) StartSession(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	var input service.StartSessionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	session, err := h.pomodoroService.StartSession(userID, &input)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, session)
}

func (h *PomodoroHandler) GetSessions(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	var startDate, endDate *time.Time
	if sd := c.Query("start_date"); sd != "" {
		if t, err := time.Parse("2006-01-02", sd); err == nil {
			startDate = &t
		}
	}
	if ed := c.Query("end_date"); ed != "" {
		if t, err := time.Parse("2006-01-02", ed); err == nil {
			t = t.Add(24*time.Hour - time.Second)
			endDate = &t
		}
	}

	result, err := h.pomodoroService.GetSessions(userID, startDate, endDate, page, limit)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, result)
}

func (h *PomodoroHandler) GetActiveSession(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	session, err := h.pomodoroService.GetActiveSession(userID)
	if err != nil {
		model.Success(c, nil)
		return
	}

	model.Success(c, session)
}

func (h *PomodoroHandler) CompleteSession(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的会话ID")
		return
	}

	session, err := h.pomodoroService.CompleteSession(userID, sessionID)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, session)
}

func (h *PomodoroHandler) CancelSession(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的会话ID")
		return
	}

	session, err := h.pomodoroService.CancelSession(userID, sessionID)
	if err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, session)
}

func (h *PomodoroHandler) DeleteSession(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	sessionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.Error(c, model.CodeParamError, "无效的会话ID")
		return
	}

	if err := h.pomodoroService.DeleteSession(userID, sessionID); err != nil {
		model.Error(c, model.CodeParamError, err.Error())
		return
	}

	model.Success(c, gin.H{"message": "删除成功"})
}

func (h *PomodoroHandler) GetTodayStats(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)

	stats, err := h.pomodoroService.GetTodayStats(userID)
	if err != nil {
		model.Error(c, model.CodeInternalError, err.Error())
		return
	}

	model.Success(c, stats)
}

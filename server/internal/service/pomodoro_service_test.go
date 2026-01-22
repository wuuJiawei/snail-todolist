package service

import (
	"testing"

	"github.com/google/uuid"
	"snail-server/internal/model"
)

// TestStartSessionInput_TitleField tests that StartSessionInput accepts title field
func TestStartSessionInput_TitleField(t *testing.T) {
	tests := []struct {
		name     string
		input    StartSessionInput
		wantType model.PomodoroSessionType
		hasTitle bool
	}{
		{
			name: "focus session with title",
			input: StartSessionInput{
				Duration: 25,
				Type:     model.PomodoroFocus,
				Title:    stringPtr("完成项目文档"),
			},
			wantType: model.PomodoroFocus,
			hasTitle: true,
		},
		{
			name: "focus session without title",
			input: StartSessionInput{
				Duration: 25,
				Type:     model.PomodoroFocus,
				Title:    nil,
			},
			wantType: model.PomodoroFocus,
			hasTitle: false,
		},
		{
			name: "break session should not have title",
			input: StartSessionInput{
				Duration: 5,
				Type:     model.PomodoroShortBreak,
				Title:    nil,
			},
			wantType: model.PomodoroShortBreak,
			hasTitle: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify input structure
			if tt.input.Type != tt.wantType {
				t.Errorf("Type = %v, want %v", tt.input.Type, tt.wantType)
			}

			if tt.hasTitle && tt.input.Title == nil {
				t.Error("Expected title to be set, but got nil")
			}

			if !tt.hasTitle && tt.input.Title != nil {
				t.Error("Expected title to be nil, but got value")
			}

			// Verify that title can be assigned to model
			session := &model.PomodoroSession{
				ID:       uuid.New(),
				UserID:   uuid.New(),
				Duration: tt.input.Duration,
				Type:     tt.input.Type,
				Title:    tt.input.Title,
			}

			if tt.hasTitle && session.Title == nil {
				t.Error("Session title should not be nil")
			}

			if !tt.hasTitle && session.Title != nil {
				t.Error("Session title should be nil")
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}

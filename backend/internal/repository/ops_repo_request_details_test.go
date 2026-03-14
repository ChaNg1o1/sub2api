package repository

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestOpsRepositoryListRequestDetails_IncludesOpenAIWSTimingFields(t *testing.T) {
	db, mock := newSQLMock(t)
	repo := &opsRepository{db: db}

	start := time.Date(2026, 3, 14, 0, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	filter := &service.OpsRequestDetailFilter{
		StartTime: &start,
		EndTime:   &end,
		Page:      1,
		PageSize:  10,
	}

	mock.ExpectQuery(`SELECT COUNT\(1\) FROM combined`).
		WithArgs(start, end).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(int64(2)))

	rows := sqlmock.NewRows([]string{
		"kind",
		"created_at",
		"request_id",
		"platform",
		"model",
		"duration_ms",
		"openai_ws_queue_wait_ms",
		"openai_ws_conn_pick_ms",
		"openai_ws_conn_reused",
		"status_code",
		"error_id",
		"phase",
		"severity",
		"message",
		"user_id",
		"api_key_id",
		"account_id",
		"group_id",
		"stream",
	}).
		AddRow(
			"success",
			end.Add(-1*time.Minute),
			"req-success",
			"openai",
			"gpt-5",
			int64(321),
			int64(41),
			int64(6),
			true,
			nil,
			nil,
			nil,
			nil,
			nil,
			int64(11),
			int64(22),
			int64(33),
			int64(44),
			true,
		).
		AddRow(
			"error",
			end.Add(-2*time.Minute),
			"req-error",
			"openai",
			"gpt-5",
			int64(900),
			nil,
			nil,
			nil,
			int64(500),
			int64(77),
			"upstream",
			"high",
			"boom",
			int64(111),
			int64(222),
			int64(333),
			int64(444),
			true,
		)

	mock.ExpectQuery(`SELECT\s+kind,\s+created_at,\s+request_id,\s+platform,\s+model,\s+duration_ms,\s+openai_ws_queue_wait_ms,\s+openai_ws_conn_pick_ms,\s+openai_ws_conn_reused`).
		WithArgs(start, end, 10, 0).
		WillReturnRows(rows)

	items, total, err := repo.ListRequestDetails(context.Background(), filter)
	require.NoError(t, err)
	require.Equal(t, int64(2), total)
	require.Len(t, items, 2)

	require.NotNil(t, items[0].OpenAIWSQueueWaitMs)
	require.Equal(t, 41, *items[0].OpenAIWSQueueWaitMs)
	require.NotNil(t, items[0].OpenAIWSConnPickMs)
	require.Equal(t, 6, *items[0].OpenAIWSConnPickMs)
	require.NotNil(t, items[0].OpenAIWSConnReused)
	require.True(t, *items[0].OpenAIWSConnReused)

	require.Nil(t, items[1].OpenAIWSQueueWaitMs)
	require.Nil(t, items[1].OpenAIWSConnPickMs)
	require.Nil(t, items[1].OpenAIWSConnReused)

	require.NoError(t, mock.ExpectationsWereMet())
}

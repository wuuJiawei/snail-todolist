package service

import (
	"github.com/google/uuid"
	"snail-server/internal/model"
	"snail-server/internal/repository"
)

type OverviewService struct {
	listRepo *repository.ListRepository
	taskRepo *repository.TaskRepository
}

func NewOverviewService(listRepo *repository.ListRepository, taskRepo *repository.TaskRepository) *OverviewService {
	return &OverviewService{
		listRepo: listRepo,
		taskRepo: taskRepo,
	}
}

type OverviewStats struct {
	TotalLists   int64 `json:"total_lists"`
	TotalTasks   int64 `json:"total_tasks"`
	TodoCount    int64 `json:"todo_count"`
	DoingCount   int64 `json:"doing_count"`
	DoneCount    int64 `json:"done_count"`
	OverdueCount int64 `json:"overdue_count"`
}

type ListWithStats struct {
	model.List
	TaskStats     TaskStats    `json:"task_stats"`
	UpcomingTasks []model.Task `json:"upcoming_tasks,omitempty"`
}

type TaskStats struct {
	Total int64 `json:"total"`
	Todo  int64 `json:"todo"`
	Doing int64 `json:"doing"`
	Done  int64 `json:"done"`
}

type OverviewResponse struct {
	Stats      OverviewStats   `json:"stats"`
	Lists      []ListWithStats `json:"lists"`
	TodayTasks []model.Task    `json:"today_tasks"`
}

// GetOverview 获取仪表盘概览数据（聚合查询）
func (s *OverviewService) GetOverview(userID uuid.UUID) (*OverviewResponse, error) {
	// 获取用户的所有清单
	lists, err := s.listRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 获取用户任务统计
	totalTasks, todoCount, doingCount, doneCount, overdueCount, err := s.taskRepo.CountByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 获取今日任务
	todayTasks, err := s.taskRepo.GetTodayTasks(userID)
	if err != nil {
		return nil, err
	}

	// 构建带统计的清单列表
	listsWithStats := make([]ListWithStats, len(lists))
	for i, list := range lists {
		total, todo, doing, done, _ := s.taskRepo.CountByListID(list.ID)

		// 获取该清单最近 3 个即将到期的任务
		upcomingTasks, _ := s.taskRepo.GetUpcomingTasks(userID, 7)
		var listUpcoming []model.Task
		for _, t := range upcomingTasks {
			if t.ListID == list.ID && len(listUpcoming) < 3 {
				listUpcoming = append(listUpcoming, t)
			}
		}

		listsWithStats[i] = ListWithStats{
			List: list,
			TaskStats: TaskStats{
				Total: total,
				Todo:  todo,
				Doing: doing,
				Done:  done,
			},
			UpcomingTasks: listUpcoming,
		}
	}

	return &OverviewResponse{
		Stats: OverviewStats{
			TotalLists:   int64(len(lists)),
			TotalTasks:   totalTasks,
			TodoCount:    todoCount,
			DoingCount:   doingCount,
			DoneCount:    doneCount,
			OverdueCount: overdueCount,
		},
		Lists:      listsWithStats,
		TodayTasks: todayTasks,
	}, nil
}

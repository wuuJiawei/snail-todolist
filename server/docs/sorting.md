# 拖拽排序设计文档

## 排序策略

使用浮点数 `sort_order` 字段实现拖拽排序，避免频繁重排所有记录。

## 算法说明

### 初始化
- 新建任务/清单时，`sort_order` 默认为 0
- 查询时按 `sort_order ASC, created_at DESC` 排序

### 拖拽排序
当用户将项目 A 拖拽到位置 B 和 C 之间时：
1. 获取 B 的 `sort_order` (prev) 和 C 的 `sort_order` (next)
2. 计算 A 的新 `sort_order = (prev + next) / 2`

### 边界情况
- 拖到最前面：`sort_order = prev_first - 1000`
- 拖到最后面：`sort_order = prev_last + 1000`
- 精度不足时（差值 < 0.001）：触发重排，重新分配整数序号

### 重排策略
当检测到精度不足时，对该用户/清单下的所有项目重新分配 sort_order：
```sql
UPDATE tasks SET sort_order = row_number * 1000
WHERE list_id = ? ORDER BY sort_order ASC
```

## API 设计

### 任务排序
```
PATCH /api/v1/tasks/:id/sort
{
  "after_id": "uuid",   // 放在此任务之后（可选）
  "before_id": "uuid"   // 放在此任务之前（可选）
}
```

### 清单排序
```
PATCH /api/v1/lists/:id/sort
{
  "after_id": "uuid",
  "before_id": "uuid"
}
```

## 数据模型

Task 和 List 模型已包含 `sort_order int` 字段，默认值为 0。

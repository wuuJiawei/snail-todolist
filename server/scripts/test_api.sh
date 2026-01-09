#!/bin/bash
# API 测试脚本

BASE_URL="http://localhost:23333"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"

echo "=========================================="
echo "SnailTask Server API 测试"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo "  Response: $2"
}

# T3.6 认证接口测试
echo "=== T3.6 认证接口测试 ==="
echo ""

# 1. 健康检查
echo "1. 健康检查 /healthz"
RESP=$(curl -s "$BASE_URL/healthz")
if echo "$RESP" | grep -q '"status":"ok"'; then
    pass "健康检查"
else
    fail "健康检查" "$RESP"
fi

# 2. 就绪检查
echo "2. 就绪检查 /readyz"
RESP=$(curl -s "$BASE_URL/readyz")
if echo "$RESP" | grep -q '"status":"ok"'; then
    pass "就绪检查"
else
    fail "就绪检查" "$RESP"
fi

# 3. 注册用户
echo "3. 注册用户"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"123456\",\"nickname\":\"Test User\"}")
if echo "$RESP" | grep -q '"token"'; then
    pass "注册用户"
    TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    fail "注册用户" "$RESP"
    exit 1
fi

# 4. 重复注册（应失败）
echo "4. 重复注册（应失败）"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"123456\",\"nickname\":\"Test User\"}")
if echo "$RESP" | grep -q '"error"'; then
    pass "重复注册拒绝"
else
    fail "重复注册应该被拒绝" "$RESP"
fi

# 5. 登录
echo "5. 登录"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"123456\"}")
if echo "$RESP" | grep -q '"token"'; then
    pass "登录"
    TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    fail "登录" "$RESP"
    exit 1
fi

# 6. 错误密码登录
echo "6. 错误密码登录（应失败）"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")
if echo "$RESP" | grep -q '"error"'; then
    pass "错误密码拒绝"
else
    fail "错误密码应该被拒绝" "$RESP"
fi

# 7. 获取用户资料
echo "7. 获取用户资料"
RESP=$(curl -s "$BASE_URL/api/v1/user/profile" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"email"'; then
    pass "获取用户资料"
else
    fail "获取用户资料" "$RESP"
fi

echo ""
echo "=== T4.4 清单接口测试 ==="
echo ""

# 8. 创建清单
echo "8. 创建清单"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/lists" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"工作","color":"#6366f1"}')
if echo "$RESP" | grep -q '"id"'; then
    pass "创建清单"
    LIST_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  LIST_ID: $LIST_ID"
else
    fail "创建清单" "$RESP"
    exit 1
fi

# 9. 获取清单列表
echo "9. 获取清单列表"
RESP=$(curl -s "$BASE_URL/api/v1/lists" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"工作"'; then
    pass "获取清单列表"
else
    fail "获取清单列表" "$RESP"
fi

# 10. 更新清单
echo "10. 更新清单"
RESP=$(curl -s -X PUT "$BASE_URL/api/v1/lists/$LIST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"工作项目","color":"#ef4444"}')
if echo "$RESP" | grep -q '"工作项目"'; then
    pass "更新清单"
else
    fail "更新清单" "$RESP"
fi

echo ""
echo "=== T5.4 任务接口测试 ==="
echo ""

# 11. 创建任务
echo "11. 创建任务"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/lists/$LIST_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"完成报告","priority":2,"description":"这是一个测试任务"}')
if echo "$RESP" | grep -q '"id"'; then
    pass "创建任务"
    TASK_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  TASK_ID: $TASK_ID"
else
    fail "创建任务" "$RESP"
    exit 1
fi

# 12. 获取任务详情
echo "12. 获取任务详情"
RESP=$(curl -s "$BASE_URL/api/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"完成报告"'; then
    pass "获取任务详情"
else
    fail "获取任务详情" "$RESP"
fi

# 13. 获取清单下的任务
echo "13. 获取清单下的任务"
RESP=$(curl -s "$BASE_URL/api/v1/lists/$LIST_ID/tasks" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"tasks"'; then
    pass "获取清单下的任务"
else
    fail "获取清单下的任务" "$RESP"
fi

# 14. 更新任务状态
echo "14. 更新任务状态"
RESP=$(curl -s -X PATCH "$BASE_URL/api/v1/tasks/$TASK_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"doing"}')
if echo "$RESP" | grep -q '"doing"'; then
    pass "更新任务状态"
else
    fail "更新任务状态" "$RESP"
fi

# 15. 更新任务
echo "15. 更新任务"
RESP=$(curl -s -X PUT "$BASE_URL/api/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"完成年度报告","priority":3}')
if echo "$RESP" | grep -q '"完成年度报告"'; then
    pass "更新任务"
else
    fail "更新任务" "$RESP"
fi

echo ""
echo "=== T6.3 聚合接口测试 ==="
echo ""

# 16. 获取仪表盘概览
echo "16. 获取仪表盘概览 /overview"
RESP=$(curl -s "$BASE_URL/api/v1/overview" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"stats"' && echo "$RESP" | grep -q '"lists"'; then
    pass "获取仪表盘概览"
    echo "  Stats: $(echo "$RESP" | grep -o '"stats":{[^}]*}')"
else
    fail "获取仪表盘概览" "$RESP"
fi

# 17. 获取今日任务
echo "17. 获取今日任务 /today"
RESP=$(curl -s "$BASE_URL/api/v1/today" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"code":0' || echo "$RESP" | grep -q '"data"'; then
    pass "获取今日任务"
else
    fail "获取今日任务" "$RESP"
fi

# 18. 获取即将到期任务
echo "18. 获取即将到期任务 /upcoming"
RESP=$(curl -s "$BASE_URL/api/v1/upcoming" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"code":0' || echo "$RESP" | grep -q '"data"'; then
    pass "获取即将到期任务"
else
    fail "获取即将到期任务" "$RESP"
fi

echo ""
echo "=== T8.3 端到端测试 ==="
echo ""

# 创建更多测试数据
echo "19. 创建第二个清单"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/lists" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"生活","color":"#22c55e"}')
LIST_ID2=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$LIST_ID2" ]; then
    pass "创建第二个清单"
else
    fail "创建第二个清单" "$RESP"
fi

echo "20. 在第二个清单创建任务"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/lists/$LIST_ID2/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"买菜","priority":1}')
if echo "$RESP" | grep -q '"id"'; then
    pass "在第二个清单创建任务"
else
    fail "在第二个清单创建任务" "$RESP"
fi

echo "21. 验证 overview 聚合数据"
RESP=$(curl -s "$BASE_URL/api/v1/overview" \
  -H "Authorization: Bearer $TOKEN")
# 检查是否有 2 个清单
if echo "$RESP" | grep -q '"total_lists":2'; then
    pass "overview 显示 2 个清单"
else
    fail "overview 应显示 2 个清单" "$RESP"
fi

# 检查是否有 2 个任务
if echo "$RESP" | grep -q '"total_tasks":2'; then
    pass "overview 显示 2 个任务"
else
    fail "overview 应显示 2 个任务" "$RESP"
fi

echo ""
echo "=== 清理测试数据 ==="
echo ""

# 删除任务
echo "22. 删除任务"
RESP=$(curl -s -X DELETE "$BASE_URL/api/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"message"' || echo "$RESP" | grep -q '"code":0'; then
    pass "删除任务"
else
    fail "删除任务" "$RESP"
fi

# 删除清单
echo "23. 删除清单"
RESP=$(curl -s -X DELETE "$BASE_URL/api/v1/lists/$LIST_ID" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | grep -q '"message"'; then
    pass "删除清单"
else
    fail "删除清单" "$RESP"
fi

echo ""
echo "=========================================="
echo "测试完成！"
echo "=========================================="

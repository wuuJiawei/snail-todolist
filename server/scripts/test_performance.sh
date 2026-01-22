#!/bin/bash
# T6.4 性能验证脚本

BASE_URL="http://localhost:23333"
TIMESTAMP=$(date +%s)
TEST_EMAIL="perf${TIMESTAMP}@example.com"

# macOS 兼容的毫秒时间获取
get_ms() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: 使用 python 获取毫秒
        python3 -c 'import time; print(int(time.time() * 1000))'
    else
        # Linux
        date +%s%3N
    fi
}

echo "=========================================="
echo "T6.4 性能验证"
echo "=========================================="
echo ""

# 注册并登录
echo "1. 创建测试用户..."
RESP=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"123456\",\"nickname\":\"Perf Test\"}")
TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "注册失败"
    exit 1
fi
echo "   用户创建成功"

# 创建多个清单和任务
echo ""
echo "2. 创建测试数据..."
echo "   创建 10 个清单，每个清单 20 个任务..."

LIST_IDS=()
for i in $(seq 1 10); do
    RESP=$(curl -s -X POST "$BASE_URL/api/v1/lists" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"清单$i\",\"color\":\"#6366f1\"}")
    LIST_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    LIST_IDS+=("$LIST_ID")
    
    # 每个清单创建 20 个任务
    for j in $(seq 1 20); do
        curl -s -X POST "$BASE_URL/api/v1/lists/$LIST_ID/tasks" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"title\":\"任务${i}-${j}\",\"priority\":$((j % 4))}" > /dev/null
    done
    echo "   清单 $i 完成 (20 个任务)"
done

echo ""
echo "   总计: 10 个清单, 200 个任务"

# 性能测试
echo ""
echo "3. 性能测试 - /overview 接口"
echo ""

# 预热
curl -s "$BASE_URL/api/v1/overview" -H "Authorization: Bearer $TOKEN" > /dev/null

# 测试 10 次
TOTAL_TIME=0
for i in $(seq 1 10); do
    START=$(get_ms)
    curl -s "$BASE_URL/api/v1/overview" -H "Authorization: Bearer $TOKEN" > /dev/null
    END=$(get_ms)
    ELAPSED=$((END - START))
    TOTAL_TIME=$((TOTAL_TIME + ELAPSED))
    echo "   请求 $i: ${ELAPSED}ms"
done

AVG_TIME=$((TOTAL_TIME / 10))
echo ""
echo "   平均响应时间: ${AVG_TIME}ms"

if [ $AVG_TIME -lt 100 ]; then
    echo "   ✓ PASS: 响应时间 < 100ms"
else
    echo "   ✗ FAIL: 响应时间 >= 100ms"
fi

# 测试其他聚合接口
echo ""
echo "4. 性能测试 - /today 接口"
START=$(get_ms)
curl -s "$BASE_URL/api/v1/today" -H "Authorization: Bearer $TOKEN" > /dev/null
END=$(get_ms)
echo "   响应时间: $((END - START))ms"

echo ""
echo "5. 性能测试 - /upcoming 接口"
START=$(get_ms)
curl -s "$BASE_URL/api/v1/upcoming" -H "Authorization: Bearer $TOKEN" > /dev/null
END=$(get_ms)
echo "   响应时间: $((END - START))ms"

echo ""
echo "=========================================="
echo "性能测试完成！"
echo "=========================================="

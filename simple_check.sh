#!/bin/bash
echo "🎯 简化验证检查"

FILES=(
  "/opt/ai-project/src/pages/api/ai/chat.js"
  "/opt/ai-project/src/lib/session.js"
  "/opt/ai-project/src/pages/api/projects/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/save.js"
  "/opt/ai-project/src/pages/api/dashboard/stats.js"
)

for file in "${FILES[@]}"; do
  echo "--- $file ---"
  if [[ -f "$file" ]]; then
    # 直接检查是否有问题模式
    issues_found=false
    
    # 检查用户ID相关的parseInt
    if grep -q "parseInt.*user.*id" "$file"; then
      echo "❌ 找到 parseInt 处理用户ID:"
      grep -n "parseInt.*user.*id" "$file"
      issues_found=true
    fi
    
    # 检查isNaN验证用户ID
    if grep -q "isNaN.*user.*id" "$file"; then
      echo "❌ 找到 isNaN 验证用户ID:"
      grep -n "isNaN.*user.*id" "$file"
      issues_found=true
    fi
    
    if ! $issues_found; then
      echo "✅ 没有问题"
    fi
  else
    echo "❌ 文件不存在"
  fi
  echo ""
done

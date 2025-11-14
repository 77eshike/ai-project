#!/bin/bash
echo "🔍 检查 String ID 修复情况..."

FILES_TO_CHECK=(
  "/opt/ai-project/src/pages/api/ai/chat.js"
  "/opt/ai-project/src/lib/session.js"
  "/opt/ai-project/src/pages/api/projects/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/[id].js"
  "/opt/ai-project/src/pages/api/ai/conversations.js"
  "/opt/ai-project/src/pages/api/knowledge/save.js"
  "/opt/ai-project/src/pages/api/dashboard/stats.js"
)

echo "📋 检查关键文件:"
for file in "${FILES_TO_CHECK[@]}"; do
  echo "--- $file ---"
  if [[ -f "$file" ]]; then
    # 检查 parseInt 数量
    parseint_count=$(grep -c "parseInt" "$file" 2>/dev/null || echo "0")
    
    # 检查用户ID相关代码
    userid_patterns=$(grep -n "user.*id\|userId" "$file" 2>/dev/null | head -5 || echo "无")
    
    echo "❌ parseInt 数量: $parseint_count"
    echo "🔍 用户ID相关代码:"
    echo "$userid_patterns"
    
    if [[ $parseint_count -eq 0 ]]; then
      echo "✅ 修复完成"
    else
      echo "⚠️  需要手动检查的 parseInt:"
      grep -n "parseInt" "$file"
    fi
  else
    echo "❌ 文件不存在"
  fi
  echo ""
done

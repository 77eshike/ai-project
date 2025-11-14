#!/bin/bash
echo "🔍 最终验证所有文件"

check_file() {
  local file=$1
  echo "--- $file ---"
  
  if [[ ! -f "$file" ]]; then
    echo "❌ 文件不存在"
    return
  fi
  
  # 检查问题模式
  problematic_lines=$(grep -n -E "parseInt.*(user|session).*id|isNaN.*(user|session).*id" "$file")
  
  if [[ -z "$problematic_lines" ]]; then
    echo "✅ 没有问题"
  else
    echo "❌ 发现问题:"
    echo "$problematic_lines"
  fi
}

FILES=(
  "/opt/ai-project/src/pages/api/ai/chat.js"
  "/opt/ai-project/src/lib/session.js" 
  "/opt/ai-project/src/pages/api/projects/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/save.js"
  "/opt/ai-project/src/pages/api/dashboard/stats.js"
  "/opt/ai-project/src/pages/api/ai/conversations.js"
)

for file in "${FILES[@]}"; do
  check_file "$file"
  echo ""
done

echo "🎉 验证完成"

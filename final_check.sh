#!/bin/bash
echo "🎯 最终验证检查"

FILES=(
  "/opt/ai-project/src/pages/api/ai/chat.js"
  "/opt/ai-project/src/lib/session.js"
  "/opt/ai-project/src/pages/api/projects/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/[id].js"
  "/opt/ai-project/src/pages/api/knowledge/save.js"
  "/opt/ai-project/src/pages/api/dashboard/stats.js"
)

all_good=true
for file in "${FILES[@]}"; do
  echo "--- $file ---"
  if [[ -f "$file" ]]; then
    # 检查用户ID相关的parseInt
    user_parseints=$(grep -c "parseInt.*user.*id" "$file" 2>/dev/null || echo "0")
    # 检查isNaN验证
    isnan_checks=$(grep -c "isNaN.*user.*id" "$file" 2>/dev/null || echo "0")
    
    if [[ $user_parseints -eq 0 && $isnan_checks -eq 0 ]]; then
      echo "✅ 完全修复"
    else
      echo "❌ 仍有问题:"
      [[ $user_parseints -gt 0 ]] && grep -n "parseInt.*user.*id" "$file"
      [[ $isnan_checks -gt 0 ]] && grep -n "isNaN.*user.*id" "$file"
      all_good=false
    fi
  else
    echo "❌ 文件不存在"
    all_good=false
  fi
  echo ""
done

if $all_good; then
  echo "🎉 所有文件修复完成！"
else
  echo "⚠️  还有一些问题需要手动处理"
fi

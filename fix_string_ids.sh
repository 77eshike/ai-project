#!/bin/bash
# fix_string_ids.sh - 精确修复 String ID 问题

echo "🔍 开始精确修复 String ID 问题..."

# 创建备份目录
BACKUP_DIR="/opt/ai-project/backup_string_id_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
echo "📁 备份目录: $BACKUP_DIR"

# 源文件列表（排除构建文件）
SOURCE_FILES=(
  "/opt/ai-project/src/pages/api/auth/diagnose.js"
  "/opt/ai-project/src/pages/api/ai/conversations/[id].js"
  "/opt/ai-project/src/pages/api/ai/chat.js"
  "/opt/ai-project/src/pages/api/ai/conversations.js"
  "/opt/ai-project/src/pages/api/session/optimized.js"
  "/opt/ai-project/src/pages/api/knowledge/save.js"
  "/opt/ai-project/src/pages/api/knowledge/index.js"
  "/opt/ai-project/src/pages/api/knowledge/[id].js"
  "/opt/ai-project/src/pages/api/projects/[id].js"
  "/opt/ai-project/src/pages/api/projects/index.js"
  "/opt/ai-project/src/pages/api/projects/[id]/comments.js"
  "/opt/ai-project/src/pages/api/projects/generate-from-knowledge.js"
  "/opt/ai-project/src/pages/api/dashboard/stats.js"
  "/opt/ai-project/src/pages/api/ideas/[id]/chats.js"
  "/opt/ai-project/src/pages/api/ideas/index.js"
  "/opt/ai-project/src/pages/api/chat/send.js"
  "/opt/ai-project/src/lib/session.js"
  "/opt/ai-project/src/lib/command-processor.js"
  "/opt/ai-project/src/contexts/KnowledgeContext.js"
)

echo "📋 需要修复的文件数量: ${#SOURCE_FILES[@]}"

# 修复模式映射
declare -A FIX_PATTERNS=(
  # 用户 ID 相关
  ["parseInt(session\\.user\\.id)"]="session.user.id"
  ["parseInt(session\\.user\\.id)"]="session.user.id"
  ["parseInt(session\\.user\\?\\.id)"]="session.user?.id"
  ["parseInt(user\\.id)"]="user.id"
  ["parseInt(user\\?\\.id)"]="user?.id"
  ["parseInt(userId)"]="userId"
  ["parseInt\\(userId\\)"]="userId"
  
  # 请求中的用户 ID
  ["parseInt(req\\.user\\.id)"]="req.user.id"
  ["parseInt(req\\.user\\?\\.id)"]="req.user?.id"
  ["parseInt(req\\.query\\.userId)"]="req.query.userId"
  ["parseInt(req\\.body\\.userId)"]="req.body.userId"
  
  # 项目 ID 相关
  ["parseInt(projectId)"]="projectId"
  ["parseInt\\(projectId\\)"]="projectId"
  ["parseInt(req\\.query\\.projectId)"]="req.query.projectId"
  ["parseInt(req\\.params\\.projectId)"]="req.params.projectId"
  ["parseInt(req\\.body\\.projectId)"]="req.body.projectId"
  
  # 知识库 ID 相关
  ["parseInt(knowledgeId)"]="knowledgeId"
  ["parseInt\\(knowledgeId\\)"]="knowledgeId"
  ["parseInt(req\\.query\\.knowledgeId)"]="req.query.knowledgeId"
  ["parseInt(req\\.params\\.knowledgeId)"]="req.params.knowledgeId"
  
  # 对话 ID 相关
  ["parseInt(conversationId)"]="conversationId"
  ["parseInt\\(conversationId\\)"]="conversationId"
  ["parseInt(req\\.query\\.conversationId)"]="req.query.conversationId"
  ["parseInt(req\\.params\\.conversationId)"]="req.params.conversationId"
  
  # 其他 ID
  ["parseInt(ownerId)"]="ownerId"
  ["parseInt(parentId)"]="parentId"
  ["parseInt(ideaId)"]="ideaId"
  
  # 查询参数中的 ID
  ["parseInt(req\\.query\\.id)"]="req.query.id"
  ["parseInt(req\\.params\\.id)"]="req.params.id"
  ["parseInt(req\\.body\\.id)"]="req.body.id"
)

# 修复每个文件
for file in "${SOURCE_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "🛠️  修复文件: $file"
    
    # 备份原文件
    cp "$file" "$BACKUP_DIR/"
    
    # 应用所有修复模式
    for pattern in "${!FIX_PATTERNS[@]}"; do
      replacement="${FIX_PATTERNS[$pattern]}"
      
      # 检查文件是否包含该模式
      if grep -q "$pattern" "$file"; then
        echo "  🔄 替换: $pattern → $replacement"
        
        # 使用 sed 进行替换
        sed -i "s/$pattern/$replacement/g" "$file"
      fi
    done
    
    echo "✅ 完成修复: $file"
    echo "---"
  else
    echo "⚠️  文件不存在: $file"
  fi
done

echo "🎉 修复完成！备份保存在: $BACKUP_DIR"

# 验证修复结果
echo ""
echo "🔍 验证修复结果..."
for file in "${SOURCE_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    remaining_parseints=$(grep -c "parseInt" "$file" || true)
    if [[ $remaining_parseints -gt 0 ]]; then
      echo "⚠️  $file 仍有 $remaining_parseints 个 parseInt 需要手动检查"
    else
      echo "✅ $file 已完全修复"
    fi
  fi
done
#!/bin/bash
echo "🔧 执行最终修复..."

# 修复注释中的 parseInt 引用
sed -i 's/移除 parseInt，直接使用/已修复：直接使用/g' /opt/ai-project/src/pages/api/ai/chat.js
sed -i 's/移除 parseInt，直接使用/已修复：直接使用/g' /opt/ai-project/src/lib/session.js

# 修复 knowledge/save.js
sed -i 's/const userId = parseInt(session.user.id, 10);/const userId = session.user.id;/g' /opt/ai-project/src/pages/api/knowledge/save.js
sed -i 's/if (isNaN(userId)) {/if (!isValidUserId(userId)) {/g' /opt/ai-project/src/pages/api/knowledge/save.js

# 修复 dashboard/stats.js
sed -i 's/userId = idMatch ? parseInt(idMatch\[0\]) : 1;/userId = idMatch ? idMatch[0] : "default";/g' /opt/ai-project/src/pages/api/dashboard/stats.js

# 修复 projects/[id].js
sed -i 's/if (isNaN(userId) || userId <= 0) {/if (!isValidUserId(userId)) {/g' /opt/ai-project/src/pages/api/projects/[id].js

# 修复 knowledge/[id].js
sed -i 's/if (isNaN(userId)) {/if (!isValidUserId(userId)) {/g' /opt/ai-project/src/pages/api/knowledge/[id].js

echo "✅ 最终修复完成"

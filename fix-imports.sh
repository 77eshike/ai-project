#!/bin/bash
echo "开始修复导入路径..."

# 修复 ChatTabDesktop.js
sed -i "s|from '../../../hooks/useDesktopSpeech'|from '../../hooks/useDesktopSpeech'|g" src/components/chat/ChatTabDesktop.js

# 修复 ChatTabMobile.js  
sed -i "s|from '../../../hooks/useMobileSpeech'|from '../../hooks/useMobileSpeech'|g" src/components/chat/ChatTabMobile.js

# 修复 ChatTabBase.js
sed -i "s|from '../../contexts/KnowledgeContext'|from '../contexts/KnowledgeContext'|g" src/components/chat/ChatTabBase.js

echo "修复完成！"

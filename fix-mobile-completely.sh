#!/bin/bash
echo "开始彻底修复移动端问题..."

# 1. 创建精确的设备检测器
echo "创建精确的设备检测器..."
cat > src/components/Utils/deviceDetector.js << 'DETECTOREOF'
// ... [上面deviceDetector.js的内容]
DETECTOREOF

# 2. 更新主组件
echo "更新聊天主组件..."
cat > src/components/chat/index.js << 'INDEXEOF'
// ... [上面index.js的内容]
INDEXEOF

# 3. 更新移动端组件
echo "更新移动端组件..."
cat > src/components/chat/ChatTabMobile.js << 'MOBILEEOF'
// ... [上面ChatTabMobile.js的内容]
MOBILEEOF

# 4. 创建测试组件
echo "创建测试组件..."
cat > src/components/chat/ChatTabTest.js << 'TESTEOF'
// ... [上面ChatTabTest.js的内容]
TESTEOF

echo "修复完成！请重新构建项目。"
echo "如果问题依旧，请运行: npm run build && npm run dev"
echo "然后在浏览器控制台查看详细的设备检测日志"

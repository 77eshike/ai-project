#!/bin/bash

echo "🔍 NextAuth 诊断信息"

echo "1. 检查环境变量"
curl -s http://43.228.124.126:3000/api/auth/providers

echo -e "\n2. 检查CSRF token"
CSRF_RESPONSE=$(curl -s -c diag_cookies.txt http://43.228.124.126:3000/api/auth/csrf)
echo "CSRF响应: $CSRF_RESPONSE"

echo -e "\n3. 检查cookies"
cat diag_cookies.txt

echo -e "\n4. 测试会话"
curl -s http://43.228.124.126:3000/api/auth/session

echo -e "\n5. 测试健康状态"
curl -s http://43.228.124.126:3000/api/health

echo -e "\n✅ 诊断完成"

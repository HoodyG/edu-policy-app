#!/bin/bash
echo "🚀 部署教育政策学习平台到 Vercel"
echo ""

# 构建项目
echo "1️⃣ 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 构建成功!"
    echo ""
    echo "2️⃣ 现在请手动部署到 Vercel:"
    echo ""
    echo "📋 步骤："
    echo "   1. 打开浏览器访问: https://vercel.com/new"
    echo "   2. 登录你的 GitHub 账号"
    echo "   3. 点击 'Import Git Repository'"
    echo "   4. 选择你创建的仓库"
    echo "   5. 点击 'Deploy' (Vercel会自动识别Vite项目)"
    echo ""
    echo "🔗 部署成功后会获得类似这样的链接:"
    echo "   https://edu-policy-app.vercel.app"
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

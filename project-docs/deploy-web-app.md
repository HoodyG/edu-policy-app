# 教育时政项目发布说明

## 目标

先把当前项目发布成 Web App，给别人试用。

## 最快方案：Netlify Drop

适合今天就发一个可访问链接给别人。

### 步骤

1. 本地构建项目：

```powershell
cd "D:\trae\edu policies"
npm run build
```

2. 打开：

https://app.netlify.com/drop

3. 把项目里的 `dist` 文件夹直接拖进去。

4. Netlify 会自动生成一个公网网址。

5. 把这个网址发给别人即可。

### 优点

- 不需要 GitHub
- 不需要写服务器配置
- 几分钟内就能上线

### 注意

- 这是临时快速发布，后面你重新构建并修改内容时，需要重新拖一次 `dist`
- 用户的收藏、笔记、做题统计都保存在他们自己的浏览器本地，不会和你同步

## 长期方案：GitHub + Vercel

适合后面长期维护和持续更新。

### 步骤

1. 把项目上传到 GitHub 仓库
2. 登录 https://vercel.com
3. 选择 `New Project`
4. 导入你的 GitHub 仓库
5. Vercel 会识别为 Vite 项目
6. 使用以下配置：

- Build Command: `npm run build`
- Output Directory: `dist`

7. 点击部署

### 环境变量

如果线上还要保留 AI 问答能力，需要在 Vercel 项目设置里配置：

- `VITE_DOUBAO_API_KEY`
- `VITE_DOUBAO_MODEL`
- `VITE_DOUBAO_BASE_URL`

不配的话，AI 部分会走本地兜底逻辑或不可用。

## 上线前检查

建议你上线前自己先在手机上试一下：

- 首页搜索
- 卡片展开 / 关闭
- 收藏列表 / 自定义列表
- 添加自定义卡片
- 题目练习
- 正文高亮工具条

## 推荐顺序

1. 先用 Netlify Drop 发一个试用链接
2. 确认功能稳定后，再走 GitHub + Vercel
3. Web 版本稳定后，再用 Capacitor 包成 App

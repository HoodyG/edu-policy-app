# 教育时政项目发布说明

## 目标

让国内绝大多数人都能更稳定地打开这个 Web App，并且后续更新成本低。

---

## 当前最推荐方案

主方案：**GitHub + 腾讯 EdgeOne Pages**

原因：

- 比 `vercel.app` 更适合给国内用户访问
- 支持直接导入 GitHub 仓库
- 支持 Vite 项目自动构建
- 后续你继续 `git push` 就能自动更新

官方参考：

- EdgeOne Pages 首页：<https://pages.edgeone.ai/>
- Git 仓库导入：<https://pages.edgeone.ai/document/importing-a-git-repository>
- Vite 部署：<https://pages.edgeone.ai/document/vite>
- 自定义域名：<https://pages.edgeone.ai/document/custom-domain>

---

## 一、项目现状

当前 GitHub 仓库：

- `https://github.com/HoodyG/edu-policy-app.git`

本地项目目录：

- `D:\trae\edu policies`

本地构建命令：

```powershell
cd "D:\trae\edu policies"
npm run build
```

---

## 二、EdgeOne Pages 部署步骤

### 1. 登录 EdgeOne Pages

打开：

- `https://pages.edgeone.ai/`

### 2. 导入 GitHub 仓库

选择 Git 导入，连接 GitHub，然后选择仓库：

- `HoodyG/edu-policy-app`

官方说明里明确支持从 GitHub / GitLab / Bitbucket / Gitee 导入。

### 3. 构建配置

建议填写：

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`

Vite 官方和 EdgeOne 官方都支持这种标准配置。

### 4. 先用平台分配的项目域名

部署成功后，平台会给一个固定项目域名。  
你可以先用这个域名测试访问稳定性，再决定是否绑定自己的域名。

### 5. 如果要上自定义域名

后面建议绑定自己的域名，比如：

- `edu.xxx.com`
- `policy.xxx.com`

注意：

- 如果项目加速区域包含**中国大陆可用区**
- 并且你要绑定自定义域名
- 官方要求先完成 **ICP 备案**

参考官方说明：

- <https://pages.edgeone.ai/document/custom-domain>

---

## 三、环境变量

如果线上还要保留 AI 能力，在 Pages 项目里配置：

- `VITE_DOUBAO_API_KEY`
- `VITE_DOUBAO_MODEL`
- `VITE_DOUBAO_BASE_URL`

不配的话，AI 相关功能可能只能走兜底逻辑。

---

## 四、后续怎么更新

以后你每次改完项目，只要：

```powershell
cd "D:\trae\edu policies"
git add .
git commit -m "feat: 更新项目"
git push
```

EdgeOne Pages 会自动重新拉 GitHub 仓库并重新部署。

也就是说：

- GitHub 仓库更新
- EdgeOne Pages 自动更新
- 试用链接同步变成最新版

---

## 五、上线后先检查这些

建议你先用手机和电脑各试一遍：

- 首页搜索
- 卡片展开 / 关闭
- 收藏列表 / 自定义列表
- 添加自定义卡片
- 题目练习
- 正文高亮工具条
- 自定义卡片抓取

特别注意：

- 收藏、笔记、做题统计目前仍保存在各自浏览器本地，不是云同步
- 不同网站正文抓取效果会有差异

---

## 六、最稳的长期路线

建议你按这个顺序走：

1. 先把项目部署到 EdgeOne Pages
2. 先用平台给的项目域名测试国内访问
3. 确认功能稳定后，绑定你自己的域名
4. 如果未来长期正式给国内用户使用，再补 ICP 备案
5. Web 版本稳定后，再用 Capacitor 封装成 App

---

## 七、为什么不再优先用 Vercel

不是项目代码问题，而是访问链路问题：

- `vercel.app` 在国内访问经常不稳定
- 你现在的目标是让国内大多数人都能更顺畅访问
- 所以更适合改成国内访问更友好的平台路线

---

## 八、备选方案

### 备选 1：阿里云 OSS 静态网站

优点：

- 更传统、更稳定
- 很适合长期国内静态站

缺点：

- 域名、自定义访问、CDN、备案链路更重
- 你现在上手成本会比 EdgeOne Pages 高

官方参考：

- OSS 静态网站：<https://www.alibabacloud.com/help/en/oss/user-guide/tutorial-use-a-custom-domain-name-to-configure-static-website-hosting>
- 中国大陆自定义域名需要 ICP：<https://www.alibabacloud.com/help/doc-detail/67323.html>

### 备选 2：腾讯云 COS 静态网站

优点：

- 也是国内静态托管路线

缺点：

- 和 OSS 一样，更适合后期正式化，不是你现在最省事的第一步

官方参考：

- COS 静态网站：<https://www.tencentcloud.com/document/product/436/9512?lang=en>

---

## 结论

如果你的目标是：

> **让国内绝大多数人更稳定地打开这个项目，并且后续还能方便更新**

那当前最合适的方案就是：

> **GitHub + 腾讯 EdgeOne Pages**

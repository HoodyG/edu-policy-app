# 〖Code with SOLO〗我做了一个教育时政学习 App，把政策整理、笔记和刷题放进同一个工具

:globe_with_meridians: 项目形态：Web App  
:books: 适用场景：教育时政整理 / 教招备考 / 教育类考试  
:hammer_and_wrench: 技术栈：TRAE SOLO · React · Vite
体验链接：https://edu-policy-app.vercel.app/


<img width="1015" height="852" alt="image" src="https://github.com/user-attachments/assets/a068a498-5a91-43cd-bba0-d8504ba7893d" />
 


:pushpin: 摘要

我用 TRAE SOLO 做了一个面向教育时政学习的 Web App。  
它不只是看新闻，而是把：

- :bookmark: 收藏
- :memo: 笔记
- :high_brightness: 正文高亮标注
- :link: 来源管理
- :white_check_mark: 题目练习

放进了同一个学习闭环里。

<img width="1015" height="852" alt="image" src="https://github.com/user-attachments/assets/cec8a13f-787d-4688-80d1-7c523db0d34e" />


<img width="1015" height="852" alt="image" src="https://github.com/user-attachments/assets/992b7c3a-9255-48de-be6b-35a2ddd77c98" />


<img width="892" height="777" alt="image" src="https://github.com/user-attachments/assets/8b70f5a0-c56f-456c-85e1-c2cc6411e24f" />


<img width="1015" height="852" alt="image" src="https://github.com/user-attachments/assets/4630c7ee-ed9f-40c0-ab09-7d6eeed6fb96" />


<img width="1015" height="852" alt="image" src="https://github.com/user-attachments/assets/548dae77-df2b-4696-8147-d807e6221735" />


---

:bullseye: 为什么做

教育时政内容很多，但真正用于学习时会很碎：

- 原文在网页里
- 摘要在文档里
- 笔记在别的软件里
- 题目又在别的地方
- 正确率和复盘还得自己记

所以我想做一个工具，把“看政策 → 记重点 → 做题 → 统计”串起来。

---

:puzzle_piece: 这个项目现在能做什么

目前已经实现：

- :newspaper: 教育时政时间线卡片浏览
- :link: 官方来源优先，多来源可选
- :bookmark_tabs: 收藏列表、自定义列表
- :pencil2: 正文高亮、加粗、下划线、字色标注
- :memo: 每张卡片可添加笔记
- :white_check_mark: 自动识别选择题、即时判题
- :bar_chart: 每题作答次数和正确率统计
- :globe_with_meridians: 支持贴网页链接自动生成自定义卡片

---

:hammer_and_wrench: 我是怎么用 SOLO 做的

这个项目不是一次生成出来的，而是我和 SOLO 一轮一轮打磨出来的，主要做了几件事：

- 把首页卡片和展开正文分层，提升阅读体验
- 把来源系统理顺，优先官方原文
- 给正文加上标注和笔记能力
- 把题目系统接进来，形成练习闭环
- 加入自定义卡片导入，让用户能自己沉淀资料

对我来说，SOLO 最大的价值不是“直接生成页面”，而是能让我把一个真实复杂的需求持续迭代下去。

---

:wrapped_gift: 目前成果

这个项目现在已经不只是“教育新闻阅读器”，而是一个：

> **教育时政卡片库 + 笔记工具 + 题库练习器 + 自定义资料导入工具**

我最满意的是，它已经把原本分散在多个工具里的流程，收进了一个应用里。

---

:light_bulb: 下一步

接下来我还会继续优化：

- :chart_with_upwards_trend: 提升不同网站正文抓取的稳定性
- :iphone: 继续打磨移动端体验
- :building_construction: 继续收敛组件结构和弹层交互
- :rocket: 后续把它封装成 App，尝试上架应用商店

---

:speech_balloon: 想请大家聊聊

1. 你整理教育时政时，最大的痛点是什么？
2. 如果你也备考教招 / 教育类考试，你最希望它补什么功能？

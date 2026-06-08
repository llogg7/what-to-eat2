# 今天吃什么？

一个随机食物选择器，帮你解决"今天吃什么"的终极难题。

## 功能

- **随机选**：从你保存的食物列表中随机挑选
- **4 种模式**：全随机 / 按地点 / 按价格 / 排除法
- **地点管理**：添加和管理用餐地点
- **食物管理**：添加和管理喜爱的食物
- **历史记录**：查看之前的选择记录
- **收藏功能**：收藏喜欢的搭配
- **数据备份**：导出/导入 JSON 数据

## 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **存储**：浏览器 localStorage
- **部署**：GitHub Pages

## 本地运行

直接双击 `index.html` 打开即可，无需任何服务器或安装依赖。

## 部署

支持 GitHub Pages 静态部署。配置在 `.github/workflows/deploy.yml`。

将项目推送到 `main` 分支后，GitHub Actions 会自动部署到 GitHub Pages。

## 项目结构

```
├── index.html          # 主页面
├── app.js              # 前端逻辑
├── style.css           # 样式
├── templates/          # Flask 开发用模板（可忽略）
├── .github/workflows/  # CI/CD 配置
└── README.md           # 本文档
```

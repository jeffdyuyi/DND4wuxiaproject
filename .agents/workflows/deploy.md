---
description: 构建项目并推送到 GitHub Pages 进行部署
---

# 部署到 GitHub Pages

本工作流用于将项目构建并部署到 `https://jeffdyuyi.github.io/DND4wuxiaproject/`。

## 前提条件
- 已安装 Node.js 和 npm
- 已配置 Git 并连接到 GitHub 仓库
- GitHub 仓库的 Pages 设置已启用，Source 设置为 `gh-pages` 分支

## 步骤

// turbo-all

1. 安装依赖（如有必要）
```
npm install
```

2. 本地构建验证（确保无 TypeScript 错误）
```
npm run build
```

3. 推送代码到 main 分支，触发 GitHub Actions 自动部署
```
git add -A
git commit -m "feat: 更新内容"
git push origin main
```

4. 访问 GitHub Actions 查看部署状态
   - 进入仓库的 **Actions** 标签
   - 等待 "Deploy to GitHub Pages" 工作流完成（绿色对勾）

5. 访问部署地址验证
   - https://jeffdyuyi.github.io/DND4wuxiaproject/

## 注意事项
- `vite.config.ts` 中的 `base` 必须设置为 `/DND4wuxiaproject/` 才能正确加载资源
- GitHub Actions 工作流文件位于 `.github/workflows/deploy.yml`
- 部署完成通常需要 1-3 分钟

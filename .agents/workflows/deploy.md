---
description: 在用户请求发布时验证并部署 GitHub Pages
---

# GitHub Pages 发布

只在用户明确要求提交或发布时执行。本站 base 为 /DND4wuxiaproject/，推送 main 会触发 .github/workflows/deploy.yml。

1. 检查 git status 和本次具体文件的 diff。保留用户已有且与本次无关的修改；不要使用 git add -A。
2. 必要时按锁文件安装依赖：npm ci。
3. 完成 npm run lint、npm run typecheck、npm test、npm run build 和相关浏览器验收。
4. 根据用户授权暂存具体相关文件，使用准确的提交说明；仅在推送已获授权时推送 main。
5. 检查 Actions 构建与部署结果，再访问站点验证。只有观察到成功才报告发布完成。

本地构建不会自动部署。不要把私人的 localStorage 导出、恢复文件或临时测试数据加入仓库。

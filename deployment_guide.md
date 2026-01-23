# 部署设置指南 (Deployment Guide)

本项目的自动部署工作流已经配置完毕。当您将代码推送到 GitHub 的 `main` 分支时，GitHub Actions 会自动构建项目并将网页内容发布到 `gh-pages` 分支。

为了让网页对外可访问，您需要手动在 GitHub 仓库设置中开启 Pages 功能。请按照以下步骤操作：

## 步骤 1：确认工作流运行成功
1.  进入您的 GitHub 仓库页面。
2.  点击上方的 **Actions** 标签。
3.  您应该能看到名为 "Deploy to GitHub Pages" 的工作流正在运行或已经运行成功（显示绿色对勾）。
    *   如果正在运行，请等待其完成。
    *   完成后，仓库中会自动创建一个 `gh-pages` 分支。

## 步骤 2：开启 GitHub Pages
1.  点击仓库上方的 **Settings** (设置) 标签。
2.  在左侧侧边栏中，向下滚动找到 **Pages** 选项（通常在 "Code and automation" 分类下）。
3.  在 **Build and deployment** (构建与部署) 区域：
    *   **Source**: 选择 `Deploy from a branch`。
    *   **Branch**: 在下拉菜单中选择 `gh-pages` 分支，文件夹选择 `/ (root)`。
    *   点击 **Save** (保存)。

## 步骤 3：访问您的网页
保存设置后，页面上方会显示您的网页链接（通常是 `https://<您的用户名>.github.io/<仓库名>/`）。
可能需要等待 1-2 分钟，刷新页面后即可访问您的武侠创作工具！

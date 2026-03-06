---
description: 执行代码质量检查与标准优化步骤
---

# 代码优化工作流

本工作流用于对项目进行代码质量检查和常规优化。

## 步骤

1. 运行 ESLint 检查代码规范问题
```
npm run lint
```

2. 运行 TypeScript 类型检查
```
npx tsc --noEmit
```

3. 构建验证（检查是否有构建错误）
```
npm run build
```

4. 本地开发服务器预览，人工验证功能
```
npm run dev
```

## 优化清单（每次迭代进行检查）

- [ ] `localStorage` 存储是否有 `QuotaExceededError` 保护
- [ ] 无 `@ts-ignore` 或 `any` 类型绕过
- [ ] 确认对话框使用自定义组件（非原生 `confirm()`）
- [ ] 表单组件状态在切换条目时正确重置
- [ ] 全局搜索覆盖内容字段（keywords, flavor, description 等）
- [ ] React key 使用稳定的唯一标识符（非数组 index）
- [ ] 无遗留开发注释影响可读性

## 关键文件速查

| 文件 | 职责 |
|------|------|
| `src/utils/storage.ts` | localStorage 读写封装 |
| `src/App.tsx` | 状态管理与核心逻辑 |
| `src/components/Editor.tsx` | 各模块表单编辑器 |
| `src/components/Preview.tsx` | 卡片预览与图片导出 |
| `src/components/FormHelpers.tsx` | 通用表单组件库 |
| `src/constants.ts` | 全局常量与模块配置 |

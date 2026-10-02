---
description: 吾侠代码、数据兼容与卡片验收
---

# 开发验收

根据改动范围使用 docs/resource-model.md 和 docs/card-format.md。

1. 运行 npm run lint、npm run typecheck、npm test、npm run build。
2. 数据改动检查旧存档读取、导入整体验证、重复处理和保存失败恢复。
3. 表单改动检查连续编辑、切换条目、稳定 ID 和嵌入威能。
4. 卡片改动检查换行、复杂规则、长卡及不同导出格式；浏览器截图和实际 PNG 是视觉验收依据。
5. 报告实际通过的检查及未验证项，不用构建成功替代浏览器交互或图片验证。

核心文件：src/utils/archive.ts、storage.ts、resources.ts、src/hooks/useLibrary.ts、src/components/PowerEditor.tsx、PowerCard.tsx、Progression.tsx。

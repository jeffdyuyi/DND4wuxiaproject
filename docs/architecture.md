# 代码结构与维护边界

## 分层

- `App.tsx`：组合界面、管理导航与确认流程；不负责存储格式解析。
- `hooks/useLibrary.ts`：管理资源、术语、异步保存队列、加载状态、故障恢复及离页提醒；useEditorDraft 管理独立恢复草稿。
- `utils/archive.ts`：校验、迁移、导入合并与备份格式；`storage.ts`：旧存储兼容边界；`author-store.ts`：IndexedDB 主存档、修订冲突检查、原子保存与草稿记录。
- `utils/resources.ts`：条目初始化、复制与搜索；其余工具文件处理等级默认值、范围、排序及卡片格式。
- `utils/terminology.ts`：术语模型、初始候选、校验与合并；`hooks/TerminologyContext.tsx` 为共享编辑控件提供词库，持久化仍由 `useLibrary` 统一处理。同步草稿引用保证同一事件中录词和资源编辑不相互覆盖。
- `components/`：编辑与呈现。普通招式和附属威能共享 `PowerEditor`、`PowerCard`；弹窗共享 `Dialog`。
- `styles/`：`base.css` 提供基础布局与控件，`workspace.css` 管理编辑工作区和响应式布局，`cards.css` 管理可导出的资源卡，`home.css` 管理首页和欢迎内容。`index.css` 只负责按顺序引入。

## 修改原则

数据更新采用新对象；迁移保留旧键及未知扩展。读取不改写旧存档；首次迁移仅在校验成功后创建新的 IndexedDB 主存档，失败不得清空原始数据。只读 4E 模板独立于作者存档，转换后才生成可编辑副本。

静态布局放入 CSS；仅动态缩放和按数据计算的样式保留内联。交互入口使用原生按钮、输入框或对话框，避免鼠标事件直接修改 DOM 样式。资源卡的导出样式与编辑界面分开管理。

## 验证范围

`npm test` 验证迁移与往返、故障保护、导入重复处理、嵌入规则、搜索、范围与卡片选择。`npm run lint` 和 `npm run typecheck` 检查代码质量，`npm run build` 检查生产构建。

页面布局、实际 PNG 和剪贴板仍需浏览器审核。本轮根据用户要求不打开页面自动校验，不将静态测试视为浏览器验收。

SaveStatus 统一保存状态展示。资源等值比较跳过共享的未变子树，不在每次按键时序列化原版全文与快照。作者存储测试覆盖超过 5 MB、旧键保留、损坏恢复、并发冲突、写入失败原子性、草稿清理与失败时的导航保护。

Equipment 集中装备编辑与卡片；equipment-template 处理装备结构读取，template-text 共享原文清理与字段访问，避免在通用 Editor／Preview 中堆叠装备分支。

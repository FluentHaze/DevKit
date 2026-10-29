# 代码架构与开发规范

更新：2026-10-29。本文件描述实际代码结构及后续扩展约定，不再使用初始化前的建议目录。新增工具流程见[开发指南](development.md)。

## 当前技术栈与目录

React + TypeScript strict + Vite，Tailwind CSS 和语义主题变量。编辑器为原生 textarea + 行号；路由由 History API / `readRoute` 管理，翻译为本地 JSON + `translate`。当前没有 CodeMirror、React Router、i18next、Redux 或统一 cn 工具，不能将它们写成既有依赖。

```text
src/
  app/App.tsx                 # 导航、搜索、语言、主题、收藏、离线设置
  app/context.ts              # 工具页需要的共享上下文类型
  components/                 # Editor、Select、Button、图标、错误边界
  tools/metadata.json         # 工具 ID、slug、分类、排序、别名、示例
  tools/registry.ts           # 元数据转运行入口和能力标记
  tools/schema.ts             # 参数字段、默认值、枚举校验、自动处理集合
  tools/ToolPage.tsx          # 通用界面、会话草稿、文件、运行、取消、导出
  tools/transform.ts          # 大小/参数校验与领域模块懒加载分发
  tools/data.ts               # JSON、YAML、CSV、TS、差异、JSONPath
  tools/json-schema.ts        # JSON Schema / Zod 推断
  tools/inspect.ts            # 参数、HAR、环境配置、翻译和 JSON 整理
  tools/crypto.ts             # 编码、摘要、AES、HMAC、JWT
  tools/time.ts               # 时间戳、时区、日期、Cron
  tools/text.ts               # 格式化、压缩、混淆、文本与正则
  tools/visual.ts             # CSS 生成及受限预览
  tools/generate.ts           # 随机、进制、测试数据
  tools/browser.ts           # DOM 清理、SVG/图片/二维码的浏览器流程
  tools/encoding.ts          # 文件解码、字符编码、隐藏字符检查
  tools/VisualControls.tsx   # 可视列表、色标、布局、取色等交互
  tools/CronDescription.tsx  # 双语 Cron 自然语言说明
  tools/Reference.tsx        # HTTP 只读速查
  workers/transform.worker.ts # 普通工具执行、哈希文件分块、错误回传
  workers/media.worker.ts     # SVG 优化和二维码识别，可终止
  lib/                        # 错误、编码、存储、URL、敏感集合、平台按键
  i18n/                       # zh-CN / en、语言检测、翻译及覆盖测试
  styles/index.css            # Tailwind 入口、主题 tokens、基础与减少动效规则
scripts/offline.mjs           # 构建后静态入口、清单、Service Worker
scripts/check-docs.mjs        # 文档链接、工具、参数和枚举覆盖校验
public/                       # 本地静态资源
```

## 数据流与生命周期

1. `metadata.json` 由 `registry.ts` 包装供分类、搜索、首页和路由共用；`schema.ts` 提供参数面板与默认值。
2. `ToolPage` 管理输入、辅助输入、参数和结果。修改时停止旧任务并将结果置为待更新；不要用旧成功结果冒充新结果。
3. 普通工具创建模块 Worker，发送 taskId / id / input / secondary / params / 可选 File。`transform` 校验上限和枚举，再按需载入领域模块。
4. 文件哈希在 Worker 内分块；SVG / 图片 / 二维码先处理浏览器 DOM / Canvas，再把 SVG 优化与二维码解码交给媒体 Worker。
5. 成功结果回传后检查任务 ID；Markdown 的 HTML 还需在浏览器用 DOMPurify 清理后写入受限 iframe。异常映射为稳定错误 code，敏感工具不展示原始异常详情。
6. 修改、取消、超时和卸载应终止 Worker / AbortController、清除定时器，忽略过期 Promise；Object URL 在不再需要时释放。

普通任务超时 60 秒，正则 1 秒；媒体 Worker 也有 60 秒上限。它们是实现边界，不是设备无关的性能承诺。

## 自定义选择组件

`components/Select.tsx` 使用受控 `value` / `onValueChange`；声明中的 option 仅提取 value、label、禁用状态与搜索文字，不插入原生 select。`leading` 和 `displayValue` 可定制触发框内容，语言入口使用它们显示图标、名称和自动解析状态。

触发框 role=combobox，焦点保留在触发框，通过 aria-activedescendant 标识高亮选项。Portal 浮层在 body 或当前打开的 dialog 内；根据锚点矩形、视口空间和 ResizeObserver 定位，捕获滚动 / resize / 外部指针与焦点变化。Esc 只关闭当前列表，不应误关闭设置 dialog。

新增选择项继续复用此组件并提供 aria-label；不要另写原生 select、伪造 ChangeEvent 或只用 hover 展开。修改共享选择组件后检查工具参数、顶栏语言、设置主题和可视配置的全部调用方。

## 核心类型

真实定义见 [schema.ts](../src/tools/schema.ts)、[errors.ts](../src/lib/errors.ts)、[transform.worker.ts](../src/workers/transform.worker.ts)。

- `Params` 是 `Record<string, string | boolean>`；数值输入先作为字符串保存，再在算法中校验范围，不能依赖 input 的外观约束。
- `Field` 描述 text / number / select / checkbox / textarea / password 及默认值，枚举通过 `validateParams` 复核。
- `Result.text` 是主要可复制内容；`extension` 控制文本下载，`bytes` / `bytesExtension` 用于编码文件或图片，`preview` / `image` / `html` 承担不同预览，`note` 为翻译 key。
- `ToolError` 携带 code / detail。第三方错误回到 UI 时显示本地化摘要；不要在日志、错误详情或文件名中泄露秘密。
- TypeScript strict，未知输入用 unknown 和运行时校验；禁止无理由 any、ts-ignore 或非空断言。不为美观强制改写全仓既有命名。

## React、模块和注释

- 工具算法与 UI 解耦；纯转换模块不访问 React / DOM / 存储，确需 Canvas / DOM 的代码集中到浏览器流程。
- 复用既有共享组件，复杂交互保持清晰职责，不建立重复组件和不必要共享状态。
- 常规命名沿用现有 PascalCase 组件、camelCase 函数、kebab-case 工具 ID。算法按领域分模块，不要求为每个工具新建一个目录。
- 注释说明原因、边界、格式和标准来源，不逐句翻译代码。接口和数据结构的非显然约束应在实现旁注解，并同步工具手册。
- 动态 import 保持按功能加载。新依赖记录用途和许可证，不使用运行时 CDN，不为格式化增加执行输入的能力。

## 存储和隐私

唯一敏感工具集合在 `lib/sensitive-tools.ts`，供注册表、界面和 `lib/storage.ts` 共用。增删敏感工具时同时更新手册及隐私说明。

持久存储只保存语言、主题、收藏 ID、最近 ID/时间和主动开启的普通草稿。草稿检查的是 JSON 字符串长度，不等同 UTF-8 文件字节数；不直接序列化整个 React state。会话 `drafts` Map 不包含可跨页复用的 File 引用。

不执行输入，不使用 eval / new Function 或不可信 innerHTML；CSP 不开放 unsafe-eval。SVG 和 Markdown 使用 DOMPurify；CSS 生成通过值约束与 iframe CSP 隔离。图片的 blob: 预览只用于本地文件；不能因此放开外部网络源。

## 翻译与平台

所有 UI 文本在 `i18n/zh-CN.json` / `en.json`，稳定错误码和字段键不翻译。当前 `translate` 是简单 key 查找和中文回退，不是 ICU 或完整 i18next 插值系统；新增插值先确认现有实现能力。

`lib/keyboard.ts` 优先读取 UA Client Hints 平台，回退 navigator.platform：Apple 平台显示 ⌘，其他显示 Ctrl。现有快捷键处理接受 metaKey / ctrlKey；提示和行为修改需一起检查三处展示与两个处理入口。

## 测试和文档

Vitest 覆盖算法、示例、翻译、路由和性能样例；浏览器记录与自动测试分开。新增参数和模式同步[工具手册](tools.md)，共享架构或存储变化同步本文件及[验证记录](verification.md)。执行 `pnpm docs:check` 后仍需人工核对语义。

# 代码风格与架构规范

## 1. 建议技术基线

建议 React + TypeScript + Vite，使用 pnpm 管理依赖；选择稳定版本并在实施时依据官方文档核实。样式统一使用 Tailwind CSS，配合 CSS variables 管理设计 tokens 与主题；不采用 CSS Modules，不为视觉效果引入多套 UI 框架。Tailwind 的版本与 Vite 集成方式在初始化时核实官方文档后确定。

编辑器建议 CodeMirror 6，按需加载语言包；图标使用一套 SVG 库；格式化使用 Prettier 的浏览器能力及专用 SQL 格式器；算法优先 Web Crypto，缺失算法使用可靠本地库。具体依赖在实现时记录用途与许可证，不在文档中虚构 API 或固定未核实版本。

## 2. 建议目录

```text
src/
  app/                 # 路由、Provider、启动与全局布局
  components/          # 无工具业务逻辑的共享组件
  tools/
    registry.ts        # 工具元信息与懒加载入口
    json-formatter/
      index.tsx        # 工具页面
      schema.ts        # 参数和数据结构
      transform.ts     # 无 UI 的转换逻辑
      transform.test.ts
  workers/             # Worker 入口、消息协议与调度
  i18n/                # 语言初始化、格式化与 zh-CN/en 翻译资源
  hooks/               # 跨工具通用 Hook
  lib/                 # 编码、文件、存储等通用能力
  styles/              # Tailwind 入口、tokens、主题与必要的全局样式
  types/               # 跨模块公共类型
public/                # 本地静态资源与离线资源
```

## 3. 模块与类型

- 工具页面负责编排，转换逻辑接收明确输入和参数并返回结果；纯逻辑不访问 DOM、React、存储和剪贴板。
- TypeScript strict 开启；禁止无说明的 any、ts-ignore 和非空断言。未知输入使用 unknown 并做运行时校验。
- 使用判别联合表达成功、失败与 Worker 消息。错误至少包含 code、message，可选 field、line、column。
- 工具 ID 与 slug 稳定，注册表作为分类、搜索和路由唯一来源；不得在多个页面维护重复列表。
- BigInt 不直接放入 JSON.stringify；大数处理与序列化显式设计。文本与字节转换统一使用明确编码的工具函数。
- Worker 消息包括 taskId、操作、参数、结果或错误；大字节数据适用时使用 Transferable，取消后终止或忽略旧任务。

## 4. React 与状态

- 函数组件和 Hooks，保持 Hooks 调用规则；优先组件局部状态，共享状态仅用于主题、收藏、导航等。
- 不为所有工具引入全局状态仓库；避免 useEffect 派生可直接计算的数据，避免无目的 memo。
- 数据流：输入/参数 → 校验 → 处理 → 类型化结果 → 展示。输入、状态、结果分别建模，不用空字符串同时表达错误和空结果。
- 组件 props 语义明确，事件回调用 onX，布尔值用 is/has/can；复杂工具拆为输入、参数、预览和结果组件。
- 所有浏览器副作用有清理：Object URL、Worker、定时器、事件监听和未完成任务。

## 5. 命名与注释

- 组件 PascalCase；函数/变量 camelCase；Hook 以 use 开头；常量 UPPER_SNAKE_CASE 仅用于固定常量。
- 工具文件夹和工具 slug 用 kebab-case；React 组件文件用 PascalCase.tsx，共享工具模块用 kebab-case.ts；工具入口统一 index.tsx。
- 类型不用 I/T 前缀；优先显式导出，页面入口允许默认导出配合路由懒加载。
- 注释用中文解释原因、边界与标准来源；不重复描述显然的代码。公共复杂算法注明来源或标准向量。
- UI 文案集中在翻译资源，工具元信息仅保存翻译 key，不把技术堆栈、库名写成面向用户的功能卖点。

## 6. 安全与可靠性

- 不执行用户输入，禁用 eval/new Function；cURL 只解析为数据；正则隔离并超时。
- HTML 和代码以文本显示；CSS 预览受限且隔离，阻止外部 URL、脚本和不必要的同源权限。
- 不自行设计密码算法；密钥使用 crypto.getRandomValues，UUID 使用 crypto.randomUUID 或可靠安全实现。
- 本地存储使用白名单、版本号、大小限制和失败处理；禁止将整个工具 state 序列化以免保存敏感内容。
- 依赖本地打包，避免运行时 CDN。配置 CSP 时按 Worker、编辑器实际需求验证，不无条件开放 unsafe-eval。
- 对用户输入提供体积与复杂度限制，错误信息不回显密钥，不记录完整内容。

## 7. 验证要求

建议 Vitest 验证纯逻辑，React Testing Library 验证关键交互，Playwright 验证主要用户路径；工具选型在初始化时确认。

测试重点：Unicode/emoji、大整数、重复键、CSV 引号和公式、加密标准向量及认证失败、时区夏令时、无偏随机的实现逻辑、非法输入、超限与取消。避免只验证“函数调用了另一个函数”的实现镜像测试。

UI 重点：搜索键盘操作、复制失败、旧结果失效、参数错误、主题、移动端、离线资源不足与加载失败。不要为单纯样式修改堆积低价值单测；视觉验收使用截图和浏览器检查。

后续初始化后应提供 typecheck、lint、format:check、test、build 命令；相关检查通过后再交付。此阶段未创建 package.json，不宣称命令已存在或测试已执行。

## 8. Tailwind 样式约定

- 常规布局、间距、字体、边框、响应式与交互状态使用 Tailwind 工具类；共享视觉通过组件与语义 tokens 统一。
- 将设计规范的颜色、间距、圆角和层级映射为 Tailwind 主题 tokens；避免每个组件重新使用任意色值和尺寸。
- 类名必须完整可被静态扫描，不使用 `bg-${color}-500` 一类运行时拼接；状态映射到完整类名，条件组合使用统一的 cn 工具。
- cn 建议由 clsx 与兼容当前 Tailwind 版本的 tailwind-merge 组成；仅需要条件组合时不要引入复杂变体系统。
- 用户选择的渐变、颜色和布局参数使用经过校验的 CSS variables 或受限 inline style，不能靠动态拼接类名生成。
- 少量全局 CSS 用于主题变量、基础样式、第三方编辑器覆盖及无法清楚表达的关键帧；不为每个工具建立独立样式表，不大量使用 @apply 重建工具类体系。
- 深色模式统一由应用主题状态控制，支持浅色/深色/跟随系统；HTML 根节点的主题标识与 Tailwind dark 变体保持一致。
- CSS 生成工具输出标准 CSS，与站点自身使用 Tailwind 无关，不能把用户要复制的 CSS 替换成 Tailwind 类名。

## 9. 多语言代码约定

- 建议使用 i18next + react-i18next，具体版本与集成方式实施时核实；zh-CN/en 资源随应用本地打包，不从外部翻译服务读取。
- 按 common、navigation、tools、errors 等 namespace 组织；key 使用稳定语义名称，例如 tools.jsonFormatter.title，不用整段中文充当 key。资源中保存完整句子，使用命名插值，不拼接句子或使用数组下标标识文案。
- 翻译资源使用 JSON 双引号；禁止翻译字符串注入 HTML。少量富文本使用受控组件映射，不使用 dangerouslySetInnerHTML。
- 转换核心返回稳定错误 code 和结构化参数，UI 层翻译；Worker 不保存界面语言，不返回作为主提示的硬编码文案。
- 时间、数量使用 Intl 按 locale 格式化；机器结果保持格式规范。界面语言、时区、编码是独立状态。
- 工具注册表保存 titleKey、descriptionKey 和中英文搜索别名；收藏/路由/状态使用稳定 ID，不使用已翻译名称。
- 翻译覆盖检查校验 key、插值占位符、复数规则；测试覆盖语言检测、切换时状态保留与文案回退。

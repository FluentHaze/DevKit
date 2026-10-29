# 代码与文档格式规范

更新：2026-10-29。配置已经落地，以根目录 `.gitattributes`、`.editorconfig`、`.prettierrc.json`、`eslint.config.js` 为当前实现来源，不再描述“将来初始化”。

## 基本格式

`.gitattributes` 将文本统一为 LF，避免 Windows core.autocrlf 导致工作区格式检查失败；PNG/JPEG/WebP/ICO 等二进制文件不做换行转换。

- UTF-8、LF、2 空格缩进、文件末尾换行、无行尾空格；JS/TS 单引号、分号、ES5 可用位置尾逗号。
- 目标行宽 100，箭头函数参数括号保留，Markdown 不强制段内硬换行。具体解析默认值服从 Prettier，不另造一套人工排序。
- JSON 双引号、无注释或尾逗号；需要对字段增加说明时写入 Markdown 或 TypeScript 定义，不能让合法 JSON 变为注释 JSON。
- 仅修改相关文件。`pnpm format` 会全仓重排，不能作为每次修改的默认操作。

## 当前 Prettier 配置

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "arrowParens": "always",
  "endOfLine": "lf",
  "proseWrap": "preserve",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles/index.css"
}
```

Prettier 管排版和 Tailwind 类排序，ESLint 管逻辑和 Hooks。忽略目录见 `.prettierignore`，包括 dist / node_modules / pnpm-lock.yaml / 设计资源等；不能新增忽略规则来掩盖本次源码问题。

## JSX、DOM 与样式

DOM 采用清晰缩进与合理换行，尽量一行一个标签，最多三个标签，避免把页面压成一行。生成器的压缩输出不受源码排版约束。

```tsx
<section className="rounded-panel border border-border bg-surface p-4">
  <h2 className="text-base font-semibold">{t('common.input')}</h2>
  <div className="mt-3 min-w-0">{children}</div>
</section>
```

- JSX 属性双引号；属性过长交格式化器换行，不人工对齐空格。用户可见示例文案也使用翻译资源。
- 类名使用完整静态字符串，禁止运行时拼接 `bg-${color}-500`；条件分支使用既有清晰表达，不因规则文档而引入项目未有的 cn 依赖。
- 使用语义主题类，如 bg-surface / text-primary / border-border；用户可调颜色与尺寸通过校验后的 CSS variables 或受限 style 表达。
- 不使用 CSS Modules、无关 !important、大量任意色值或随意高 z-index。CSS 工具输出仍是标准 CSS。

## TypeScript 与注释

模块导入尽量按第三方、项目别名、相对模块组织，类型用 import type 或 inline type；避免深层相对路径和无用途 barrel。示例应引用真实组件位置，不出现不存在的 `components/Button`。

使用 const，确需修改才用 let；保持类型安全和现有风格。注释用中文解释意图、格式和约束，不添加大量重述代码的注释。不保留调试日志、debugger 或无理由禁用检查。

## Markdown 与功能注解

- 标题有明确层级，表格前后留空行，代码块指定语言，链接用相对仓库路径。
- 工具标题格式为 ``### `tool-id` · 中文名称``，用于一致性检查；参数键和枚举值用单行代码标识。
- 示例必须可用于当前实现，不写真实 Token、用户数据、绝对个人路径或虚构线上结果。
- 标明“已实现”“目标”“已验证”“待验收”，不能用语气代替证据。历史数字只放历史记录，不在现行说明里并列矛盾版本。
- 文档中说明非显然边界：单位、编码、原文/下载差异、文件上限、截断和不支持语法。

## 检查

```sh
pnpm exec prettier --check README.md AGENTS.md "docs/**/*.md"
pnpm docs:check
```

修改源码还需按[开发指南](development.md)执行类型、Lint、测试或构建。全仓格式失败应说明本次是否引入新问题，不静默将既有问题写成已修复。

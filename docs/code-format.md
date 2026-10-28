# 代码格式规范

本文件定义后续代码的统一格式。当前仅建立文档，不创建无法运行的 lint/格式化配置；初始化应用时把规则落实为配置与脚本。

## 1. 通用规则

- UTF-8、LF、文件末尾一个换行；删除行尾空格；代码默认 2 空格缩进，不用 Tab 缩进源码。
- 单行目标宽度 100 字符，交由格式化器决定换行；URL、长字符串等可超出。
- JS/TS 使用单引号、分号、ES5 可用位置尾逗号；箭头函数参数总是括号；对象括号内保留空格。
- JSX 属性双引号，属性过长由格式化器拆行；不手工排列对齐空格。
- JSON 使用双引号、2 空格、无注释和尾逗号；YAML 2 空格；Markdown 不强制硬换行。
- 注释或字符串换行不得通过无意义拼接迎合宽度。

## 2. Prettier 目标配置

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "proseWrap": "preserve"
}
```

此配置用于项目源码格式，不限制工具用户选择自己的输出格式。JSON 工具的 2/4 空格/Tab 由用户参数决定。

## 3. TypeScript 示例

```ts
export interface FormatOptions {
  indentation: 2 | 4 | 'tab';
  sortKeys: boolean;
}

export type ToolResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export function getIndentation(options: FormatOptions): string | number {
  return options.indentation === 'tab' ? '\t' : options.indentation;
}
```

使用 const，确需重新赋值才用 let；不使用 var。条件分支总有花括号；使用严格相等；异步函数不遗留未处理 Promise；不用复杂嵌套三元表达式。

## 4. 导入与导出

顺序：框架/第三方 → 项目绝对别名 → 同级相对模块 → 样式；组间一个空行；类型使用 import type，可放相应组中。不随意使用跨多个层级的 ../../..，统一 @/ 映射至 src/。

```tsx
import { useState } from 'react';

import { Button } from '@/components/Button';

import type { FormatOptions } from './schema';
```

禁止未使用导入和变量；避免为每个目录生成 barrel 导出，防止意外加载全部工具。动态导入以工具为边界。

## 5. Tailwind CSS 规范

组件使用 Tailwind 工具类；主题 tokens 统一定义并映射为语义类，以下示例的 surface、border、text-primary 和 panel 均为项目自定义主题项，需在初始化时实现。

```tsx
<section className="text-text-primary flex min-w-0 flex-col rounded-panel border border-border bg-surface p-4">
  <h2 className="text-base font-semibold">输入</h2>
</section>
```

- 类名顺序由 prettier-plugin-tailwindcss 自动管理，插件版本与 Tailwind/Prettier 兼容；主题入口的识别方式在初始化时按官方文档配置。不要人工维护另一套排序规则。
- 条件样式使用完整静态类名与统一 cn 工具；长 className 由格式化器处理，复杂分支提取为有语义的常量或组件。
- 禁止普通业务样式中的 !important、随意 z-index 和重复任意色值；优先项目 tokens。任意值仅用于确有必要的精确布局，重复出现应升级为 token。
- 动态用户参数使用经校验的 CSS variables 或受限 style；预览作用域隔离，不影响站点主题。
- 保留少量全局 CSS；自定义属性采用 --color-text-primary 等 kebab-case 命名，类名使用 kebab-case。不使用 CSS Modules。
- CSS 工具生成的结果依然是可直接使用的标准 CSS，不受项目 Tailwind 类名排序或命名规范限制。

## 6. 工具检查配置

初始化时配置 EditorConfig、Prettier、ESLint 的 TypeScript/React Hooks 规则，并解决冲突：格式交给 Prettier，逻辑问题交给 ESLint；使用 prettier-plugin-tailwindcss 统一工具类排序。默认禁止 debugger、生产日志中输出用户内容和无说明的 lint-disable。

忽略 dist、coverage、依赖目录、缓存和生成文件；不得用忽略规则隐藏源码问题。提交前运行 format:check、lint、typecheck、相关测试和 build；格式修复只修改相关文件，避免无关大面积重排。

## 7. 翻译资源格式

翻译 JSON 使用 UTF-8、2 空格、双引号、LF，无尾逗号；zh-CN 与 en 保持对应 namespace 和稳定 key。占位符使用命名参数，禁止直接拼接完整句子。代码标识、错误 code、工具 slug 不翻译；用户可见文本和 aria-label 必须引用翻译资源。格式检查同时包含翻译资源，覆盖检查单独执行，不依赖人工发现缺失项。

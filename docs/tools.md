# 工具功能手册

核对日期：2026-10-29。当前为 10 类、91 个稳定入口。“已实现”表示已有代码能力，不等于完成全部发布验收；验证覆盖范围见[验证记录](verification.md)。参数来自 [schema.ts](../src/tools/schema.ts)，标题和示例来自[元数据](../src/tools/metadata.json)。

## 阅读说明

- 每节提供用途、输入输出、参数默认值、可选模式、使用注解、限制和源码位置。空字符串默认值用 `""` 表示，fromZone 默认为设备 IANA 时区，不写死编辑机器时区。
- 一般输入上限 5 MiB，特定文件、条数和格式限制在各节说明。转换结果可复制与下载；只读 HTTP 速查除外。
- “禁用持久草稿”不影响当前会话内存编辑；普通草稿也需主动开启保存。文件读取关闭并清除该工具持久草稿，切页后文件需重新选择。
- 示例从页面“载入示例”开始；CSS 和数据生成器用默认参数运行；图片和二维码识别可本地生成示例。示例数据不代表生产业务规则。
- 参数与输入修改使旧结果失效。详细操作与状态见[交互规范](interaction-style.md)。

## 分类索引

- **JSON 与数据（17）**：`json-formatter`、`json-escape`、`json-diff`、`json-path`、`json-yaml`、`json-csv`、`json-typescript`、`json-schema`、`json-reshape`、`i18n-check`、`typescript-json`、`json-mock`、`spreadsheet`、`sql-tools`、`format-converter`、`table-generator`、`workflow`。
- **编码与加密（8）**：`base64`、`url-codec`、`unicode-html`、`hash`、`aes`、`hmac`、`jwt`、`certificate`。
- **时间与日期（5）**：`timestamp`、`timezone`、`date-calculator`、`cron`、`date-workbench`。
- **代码与文本（15）**：`code-formatter`、`code-minifier`、`js-obfuscator`、`text-diff`、`regex`、`text-batch`、`string-case`、`env-diff`、`text-encoding`、`text-analyzer`、`markdown-workbench`、`text-cleaner`、`document-diff`、`subtitle-tools`、`text-redact`。
- **CSS 与视觉（14）**：`color`、`gradient`、`shadow`、`radius`、`flex`、`grid`、`css-units`、`animation`、`svg-tools`、`image-css`、`css-converter`、`font-preview`、`pixel-editor`、`code-card`。
- **URL 与接口（10）**：`url-parser`、`curl-converter`、`http-reference`、`request-params`、`har-analyzer`、`request-converter`、`openapi`、`websocket`、`link-tools`、`browser-check`。
- **生成器与数值（5）**：`random`、`radix`、`mock-data`、`qr-code`、`password-generator`。
- **图片与音视频（9）**：`image-tools`、`image-batch`、`image-stitch`、`image-palette`、`image-annotate`、`audio-editor`、`video-frames`、`ascii-art`、`screenshot-beautify`。
- **文件与文档（4）**：`pdf-tools`、`file-rename`、`file-duplicates`、`file-signature`。
- **生活与决策（4）**：`split-bill`、`unit-converter`、`lottery`、`decision`。

## JSON 与数据

### `json-formatter` · JSON 格式化

**状态**：已实现。**路由**：`/tools/json-formatter`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：格式化、压缩和安全校验 JSON。
- **输入**：JSON 文本。
- **输出**：格式化、压缩或校验结果。
- **使用注解与限制**：重复键、不安全整数和可能失真的数字拒绝处理。键排序不改变数组顺序；校验模式成功时保留原输入，支持树形查看和错误行列跳转。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称   | 默认值     | 可选值或类型                    |
| ------------------- | ---------- | ------------------------------- |
| `mode` · 模式       | `"format"` | `format`、`compact`、`validate` |
| `indent` · 缩进     | `"2"`      | `2`、`4`、`tab`                 |
| `sortKeys` · 键排序 | `false`    | 布尔值                          |

**示例输入**：

```json
{ "name": "DevKit", "version": 1, "tools": ["JSON", "Base64"], "local": true }
```

### `json-escape` · JSON 转义

**状态**：已实现。**路由**：`/tools/json-escape`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：转义字符串，逐层解析嵌套 JSON。
- **输入**：文本或 JSON 字符串。
- **输出**：转义字符串或反转义文本。
- **使用注解与限制**：可继续逐层解码，界面最多累计 10 层；对象结果格式化输出，不执行其中代码。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值     | 可选值或类型         |
| ----------------- | ---------- | -------------------- |
| `mode` · 模式     | `"escape"` | `escape`、`unescape` |

**示例输入**：

```text
Hello "DevKit"
你好 👋
```

### `json-diff` · JSON 对比

**状态**：已实现。**路由**：`/tools/json-diff`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：对比 JSON 差异，支持数组对象按指定字段匹配。
- **输入**：输入与辅助输入两份 JSON。
- **输出**：字段路径、类型和前后值的差异数组。
- **使用注解与限制**：identityKey 留空按数组位置比较，填写 id 等字段可忽略对象顺序；对象数组身份缺失或重复报错。数字 1 与字符串 "1" 为不同身份；对象键顺序始终忽略。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称                | 默认值 | 可选值或类型 |
| -------------------------------- | ------ | ------------ |
| `identityKey` · 数组对象匹配字段 | `""`   | 文本         |

**示例输入**：

```json
{ "name": "DevKit", "version": 1, "tags": ["local"] }
```

### `json-path` · JSONPath 查询

**状态**：已实现。**路由**：`/tools/json-path`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：安全提取数据并查看匹配路径。
- **输入**：JSON 和查询表达式。
- **输出**：匹配数量、路径和值。
- **使用注解与限制**：支持字段、索引、通配、递归字段和正向数组切片；不支持脚本过滤，不宣称完整 RFC 9535。无匹配是空结果；可单独复制前 100 条路径，完整结果仍可导出。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称    | 默认值              | 可选值或类型 |
| -------------------- | ------------------- | ------------ |
| `query` · 查询表达式 | `"$.users[*].name"` | 文本         |

**示例输入**：

```json
{ "users": [{ "name": "Ada" }, { "name": "Lin" }] }
```

### `json-yaml` · JSON ↔ YAML

**状态**：已实现。**路由**：`/tools/json-yaml`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：本地转换 JSON 和 YAML 1.2。
- **输入**：JSON 或 YAML。
- **输出**：YAML 或格式化 JSON。
- **使用注解与限制**：YAML core schema 限制别名展开，拒绝重复键、不兼容标签和复杂 Map 键，不保留注释；超出安全范围的整数拒绝转换。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值           | 可选值或类型                   |
| ----------------- | ---------------- | ------------------------------ |
| `mode` · 模式     | `"json-to-yaml"` | `json-to-yaml`、`yaml-to-json` |

**示例输入**：

```json
{ "name": "DevKit", "local": true }
```

### `json-csv` · JSON ↔ CSV

**状态**：已实现。**路由**：`/tools/json-csv`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：处理引号、多行字段和表格数据。
- **输入**：对象数组 JSON 或 CSV。
- **输出**：CSV 或 JSON。
- **使用注解与限制**：CSV 字段保留文本，不自动猜数字类型。导出嵌套对象需选 stringify；公式注入防护可能改变单元格内容；可选表头、分隔符、换行和 UTF-8 BOM。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称        | 默认值          | 可选值或类型                 |
| ------------------------ | --------------- | ---------------------------- |
| `mode` · 模式            | `"json-to-csv"` | `json-to-csv`、`csv-to-json` |
| `delimiter` · 分隔符     | `","`           | 文本                         |
| `header` · 包含表头      | `true`          | 布尔值                       |
| `newline` · 换行符       | `"LF"`          | `LF`、`CRLF`                 |
| `bom` · 输出添加 BOM     | `false`         | 布尔值                       |
| `nested` · 嵌套对象      | `"reject"`      | `reject`、`stringify`        |
| `formula` · 公式注入防护 | `true`          | 布尔值                       |

**示例输入**：

```json
[
  { "name": "Ada", "role": "Developer" },
  { "name": "Lin", "role": "Designer" }
]
```

### `json-typescript` · JSON → TypeScript

**状态**：已实现。**路由**：`/tools/json-typescript`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：从样例生成嵌套类型与联合类型。
- **输入**：JSON 样本。
- **输出**：TypeScript interface 或 type。
- **使用注解与限制**：根名称需为有效标识符；空数组输出 unknown[]，null 保持 null；不推断未出现字段和业务约束。
- **实现**：[data.ts](../src/tools/data.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值        | 可选值或类型        |
| --------------------- | ------------- | ------------------- |
| `mode` · 模式         | `"interface"` | `interface`、`type` |
| `rootName` · 根类型名 | `"Root"`      | 文本                |

**示例输入**：

```json
{ "name": "DevKit", "count": 39, "tags": ["local"], "meta": null }
```

### `json-schema` · JSON → Zod / Schema

**状态**：已实现。**路由**：`/tools/json-schema`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：从示例生成 Zod 校验代码或 JSON Schema。
- **输入**：JSON 样本。
- **输出**：Zod 校验代码与类型，或 JSON Schema 2020-12。
- **使用注解与限制**：合并数组对象样本，识别可空和缺失字段，optionalFields 可设所有字段可选；空数组项为未知，对象默认拒绝额外字段。生成代码不执行，业务约束需补齐。
- **实现**：[json-schema.ts](../src/tools/json-schema.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称               | 默认值   | 可选值或类型         |
| ------------------------------- | -------- | -------------------- |
| `target` · 目标代码             | `"zod"`  | `zod`、`json-schema` |
| `rootName` · 根类型名           | `"Root"` | 文本                 |
| `optionalFields` · 所有字段可选 | `false`  | 布尔值               |

**示例输入**：

```json
{
  "users": [
    { "id": 1, "name": "Ada" },
    { "id": 2, "name": null, "active": true }
  ]
}
```

### `json-reshape` · JSON 数据整理

**状态**：已实现。**路由**：`/tools/json-reshape`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：筛选与重命名字段、扁平化、数组转映射。
- **输入**：JSON 和 JSONPath。
- **输出**：筛选、重命名、扁平化结果或索引映射。
- **使用注解与限制**：pickFields 逗号分隔、只筛选选中对象顶层字段，留空保留全部；renameFields 是 JSON 映射。flatten 以 JSON 路径数组编码作键；to-map 使用 identityKey，重复字符串化键拒绝。
- **实现**：[inspect.ts](../src/tools/inspect.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称                                 | 默认值          | 可选值或类型                       |
| ------------------------------------------------- | --------------- | ---------------------------------- |
| `mode` · 模式                                     | `"pick-rename"` | `pick-rename`、`flatten`、`to-map` |
| `query` · 查询表达式                              | `"$"`           | 文本                               |
| `pickFields` · 保留字段（逗号分隔，留空保留全部） | `""`            | 文本                               |
| `renameFields` · 字段重命名（JSON 对象）          | `"{}"`          | 多行文本 / JSON 配置               |
| `identityKey` · 数组对象匹配字段                  | `"id"`          | 文本                               |

**示例输入**：

```json
[
  { "id": 1, "name": "Ada", "active": true },
  { "id": 2, "name": "Lin", "active": false }
]
```

### `i18n-check` · 多语言资源检查

**状态**：已实现。**路由**：`/tools/i18n-check`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：检查 JSON 翻译的缺失键、空值和插值差异。
- **输入**：源 JSON 和目标 JSON。
- **输出**：缺失、多余、空翻译、非法值及占位符报告。
- **使用注解与限制**：嵌套路径用数组表示，避免含点字面键歧义。检查 {name}、{{name}} 和常见 printf；%% 为字面百分号。不支持完整 ICU MessageFormat。
- **实现**：[inspect.ts](../src/tools/inspect.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**：无独立参数；按页面输入或速查搜索使用。

**示例输入**：

```json
{ "hello": "Hello {name}", "save": "Save", "menu": { "home": "Home" } }
```

### `typescript-json` · TypeScript → JSON 示例

**状态**：已实现。**路由**：`/tools/typescript-json`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：从 TypeScript 类型生成可复制、下载的 JSON 示例。
- **输入**：一个或多个 interface / type 声明，可带 export；相关类型需一并粘贴。
- **输出**：缩进 JSON；string 为 example，number 为 1，boolean 为 true，字面量保留原值。
- **使用注解与限制**：rootName 留空使用第一个声明；支持对象、只读属性、可选属性、数组、Array / ReadonlyArray、元组、本地类型引用、interface extends、无冲突的对象交叉类型。联合类型取首个非 undefined 分支，包括 null；可选字段默认包含。数组数量 0–20，元组保持其固定结构。只解析 AST，不执行代码。循环引用、缺失引用、语法错误明确报错；不支持泛型声明、工具类型、索引签名、函数、类、枚举、条件/映射类型、any/unknown/never/undefined 独立值、导入和运行时代码。仅遍历选中的联合分支和实际生成的可选字段；未使用声明不做类型检查。并非完整 TypeScript 编译器或业务数据生成器。输入上限 5 MiB；生成节点上限 20000、深度上限 60。
- **实现**：[typescript-json.ts](../src/tools/typescript-json.ts)，复用 Prettier TypeScript AST 解析器与现有 Worker。

**参数**：

| 参数键 / 界面名称                | 默认值 | 可选值或类型 |
| -------------------------------- | ------ | ------------ |
| `rootName` · 根类型名            | ""     | 文本         |
| `includeOptional` · 包含可选字段 | `true` | 布尔值       |
| `arrayCount` · 数组元素数量      | `1`    | 整数 0–20    |

**示例输入**：

```ts
interface User {
  id: number;
  name: string;
  active: boolean;
  tags: string[];
  profile?: { city: string };
}
```

### `json-mock` · JSON → Mock 数据

**状态**：已实现。**路由**：`/tools/json-mock`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：JSON → Mock 数据。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按 JSON 样例结构生成最多 1000 条确定性测试数据；字段名识别邮箱、日期、姓名和 ID，其他值按固定规则替换，不是业务模型推断。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值 | 可选值或类型 |
| ------- | ------ | ------------ |
| `count` | `10`   | number       |

**示例输入**：

```text
{"id":1,"name":"Ada","email":"ada@example.com","createdAt":"2026-01-01","active":true}
```

### `spreadsheet` · Excel / CSV 工作台

**状态**：已实现。**路由**：`/tools/spreadsheet`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：Excel / CSV 工作台。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：打开 XLSX/CSV 或输入 JSON 对象数组，支持多文件按相同表头合并、去重、列选择、包含筛选、拆分导出。XLSX 公式只读取缓存结果；不保留样式或宏。最多 10000 行、200 列，导出表格对公式字符加单引号。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键         | 默认值   | 可选值或类型          |
| -------------- | -------- | --------------------- |
| `format`       | `"json"` | `json`、`csv`、`xlsx` |
| `sheet`        | `1`      | number                |
| `unique`       | `false`  | checkbox              |
| `columnNames`  | `""`     | text                  |
| `filterColumn` | `""`     | text                  |
| `filterValue`  | `""`     | text                  |
| `chunk`        | `0`      | number                |

**示例输入**：

```text
[{"name":"Ada","score":95},{"name":"Lin","score":88}]
```

### `sql-tools` · SQL 数据工具

**状态**：已实现。**路由**：`/tools/sql-tools`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：SQL 数据工具。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：JSON 转 INSERT 使用标准双引号标识符和字符串转义；简单 CREATE TABLE 转类型；问号参数填充跳过 SQL 引号与注释，只用于查看。DDL 不支持表级约束与复杂方言，不连接数据库。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值          | 可选值或类型                  |
| -------- | --------------- | ----------------------------- |
| `mode`   | `"insert"`      | `insert`、`ddl-types`、`fill` |
| `table`  | `"users"`       | text                          |
| `values` | `"[1,\"Ada\"]"` | textarea                      |

**示例输入**：

```text
[{"id":1,"name":"Ada"},{"id":2,"name":"Lin"}]
```

### `format-converter` · JSON / XML / YAML / TOML / INI

**状态**：已实现。**路由**：`/tools/format-converter`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：JSON / XML / YAML / TOML / INI。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：结构化格式互转；XML 使用 @ 前缀属性表示，禁用 DTD/实体。目标格式不一定能表达所有 JSON 结构；INI 只支持简单键及一级节。格式转换可能改变注释、日期或数值表示，需核对输出。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键         | 默认值   | 可选值或类型                         |
| -------------- | -------- | ------------------------------------ |
| `sourceFormat` | `"json"` | `json`、`xml`、`yaml`、`toml`、`ini` |
| `outputFormat` | `"yaml"` | `yaml`、`json`、`xml`、`toml`、`ini` |

**示例输入**：

```text
{"app":{"name":"DevKit","port":3000}}
```

### `table-generator` · HTML / Markdown 表格

**状态**：已实现。**路由**：`/tools/table-generator`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：HTML / Markdown 表格。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：编辑 JSON 对象数组生成 HTML 或 Markdown 表格，列取所有行键的并集；可视编辑最多 100 行，大数据继续用文本编辑器；HTML 单元格转义，不执行用户内容。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值   | 可选值或类型       |
| -------- | -------- | ------------------ |
| `format` | `"html"` | `html`、`markdown` |

**示例输入**：

```text
[{"name":"Ada","role":"Developer"},{"name":"Lin","role":"Designer"}]
```

### `workflow` · 快捷工作流

**状态**：已实现。**路由**：`/tools/workflow`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：快捷工作流。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按 steps 数组串联最多 10 个文本转换，仅允许内置安全转换白名单；每一步有 tool 与可选 params，不执行脚本或联网。支持 CSV→JSON→TypeScript 等流程；批量图片使用图片批处理工具。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键          | 默认值                                                                                                                                                                                                             | 可选值或类型 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `workflowSteps` | `"[\n  {\n    \"tool\": \"json-formatter\",\n    \"params\": {\n      \"mode\": \"format\"\n    }\n  },\n  {\n    \"tool\": \"json-typescript\",\n    \"params\": {\n      \"rootName\": \"Root\"\n    }\n  }\n]"` | textarea     |

**示例输入**：

```text
{"name":"Ada","active":true}
```

## 编码与加密

### `base64` · Base64

**状态**：已实现。**路由**：`/tools/base64`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：Unicode、URL 安全编码与原始字节。
- **输入**：文本、HEX 字节或 Base64。
- **输出**：编码文本、解码文本或 HEX，可下载字节。
- **使用注解与限制**：format=bytes 时编码输入为 HEX。非法 UTF-8 显示 HEX 和提示，不冒充原文。Base64URL 和普通 Base64 分开校验字母表与 padding。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称    | 默认值     | 可选值或类型          |
| -------------------- | ---------- | --------------------- |
| `mode` · 模式        | `"encode"` | `encode`、`decode`    |
| `variant` · 编码类型 | `"Base64"` | `Base64`、`Base64URL` |
| `format` · 格式      | `"text"`   | `text`、`bytes`       |

**示例输入**：

```text
Hello, 世界 👋
```

### `url-codec` · URL 编解码

**状态**：已实现。**路由**：`/tools/url-codec`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：区分完整 URI、参数和表单编码。
- **输入**：URI、参数值或表单内容。
- **输出**：编码或解码文本。
- **使用注解与限制**：uri 对应完整 URI，component 对应单个参数；form 中 + 表示空格。仅解码一次，非法百分号编码拒绝。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称    | 默认值        | 可选值或类型               |
| -------------------- | ------------- | -------------------------- |
| `mode` · 模式        | `"encode"`    | `encode`、`decode`         |
| `variant` · 编码类型 | `"component"` | `component`、`uri`、`form` |

**示例输入**：

```text
Hello 世界 + & /
```

### `unicode-html` · Unicode / HTML 实体

**状态**：已实现。**路由**：`/tools/unicode-html`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：转换 Unicode 转义和 HTML 实体。
- **输入**：文本、Unicode 转义或 HTML 实体。
- **输出**：Unicode 或 HTML 编解码文本。
- **使用注解与限制**：Unicode 编码按 UTF-16 单元输出，emoji 可产生代理对；HTML 结果只以文本展示，不插入页面执行。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值             | 可选值或类型                                                     |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| `mode` · 模式     | `"unicode-encode"` | `unicode-encode`、`unicode-decode`、`html-encode`、`html-decode` |

**示例输入**：

```text
<Hello> 世界 👋 & "DevKit"
```

### `hash` · 哈希摘要

**状态**：已实现。**路由**：`/tools/hash`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：文本和本地文件的摘要校验。
- **输入**：文本或本地文件。
- **输出**：HEX 或 Base64 摘要。
- **使用注解与限制**：文件上限 100 MiB，Worker 内按 1 MiB 分块。MD5 / SHA-1 仅供兼容和非安全校验；摘要不是加密，不能恢复文件。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值      | 可选值或类型                         |
| --------------------- | ----------- | ------------------------------------ |
| `algorithm` · 算法    | `"SHA-256"` | `SHA-256`、`SHA-512`、`SHA-1`、`MD5` |
| `encoding` · 输出格式 | `"HEX"`     | `HEX`、`Base64`                      |

**示例输入**：

```text
hello
```

### `aes` · AES 加解密

**状态**：已实现。**路由**：`/tools/aes`。**持久草稿**：禁用。

- **用途**：使用原始密钥进行 AES-GCM / CBC 加解密。
- **输入**：文本、结构化密文包或 Base64 密文。
- **输出**：完整密文 JSON 包或解密文本。
- **使用注解与限制**：使用 HEX / Base64 原始密钥，支持 128 / 191 / 256 位。每次加密随机 IV；GCM 为 12 字节 IV、128 位 tag，CBC 为 16 字节 IV、PKCS#7。不是密码派生工具；认证失败不输出部分明文。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称        | 默认值      | 可选值或类型         |
| ------------------------ | ----------- | -------------------- |
| `mode` · 模式            | `"encrypt"` | `encrypt`、`decrypt` |
| `algorithm` · 算法       | `"AES-GCM"` | `AES-GCM`、`AES-CBC` |
| `keyEncoding` · 密钥编码 | `"HEX"`     | `HEX`、`Base64`      |
| `key` · 密钥             | `""`        | 密钥输入框           |
| `iv` · IV（解密时）      | `""`        | 文本                 |

**示例输入**：

```text
Hello DevKit
```

### `hmac` · HMAC 签名

**状态**：已实现。**路由**：`/tools/hmac`。**持久草稿**：禁用。

- **用途**：生成和校验 SHA-256 / SHA-512 签名。
- **输入**：消息、密钥和可选待校验签名。
- **输出**：签名或 verified 结果。
- **使用注解与限制**：支持 SHA-256 / SHA-512；签名和密钥编码需显式指定。空密钥默认拒绝，需要主动勾选 allowEmpty。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称         | 默认值       | 可选值或类型            |
| ------------------------- | ------------ | ----------------------- |
| `mode` · 模式             | `"generate"` | `generate`、`verify`    |
| `algorithm` · 算法        | `"SHA-256"`  | `SHA-256`、`SHA-512`    |
| `keyEncoding` · 密钥编码  | `"text"`     | `text`、`HEX`、`Base64` |
| `key` · 密钥              | `""`         | 密钥输入框              |
| `allowEmpty` · 允许空密钥 | `false`      | 布尔值                  |
| `encoding` · 输出格式     | `"HEX"`      | `HEX`、`Base64`         |
| `signature` · 待校验签名  | `""`         | 文本                    |

**示例输入**：

```text
Hello DevKit
```

### `jwt` · JWT 解析

**状态**：已实现。**路由**：`/tools/jwt`。**持久草稿**：禁用。

- **用途**：查看声明与时间，不进行签名验证。
- **输入**：三段 JWT 字符串。
- **输出**：Header、Payload、声明时间和 signatureVerified=false。
- **使用注解与限制**：只解析不验签，显示 exp / iat / nbf 的 UTC 与本地时间；不代表 Token 可信或当前可用。
- **实现**：[crypto.ts](../src/tools/crypto.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**：无独立参数；按页面输入或速查搜索使用。

**示例输入**：

```text
eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZXZraXQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTczMDAwMDAwMH0.
```

### `certificate` · X.509 证书解析

**状态**：已实现。**路由**：`/tools/certificate`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：X.509 证书解析。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：解析 PEM X.509 的主体、签发者、序列号、有效期、签名算法和 SHA-256 指纹。仅解析及到期检查，不验证信任链、签名、吊销或域名。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

**示例输入**：

```text
-----BEGIN CERTIFICATE-----
MIIBLTCB1aADAgECAgEBMAoGCCqGSM49BAMCMB8xHTAbBgNVBAMTFERldktpdCBM
b2NhbCBFeGFtcGxlMB4XDTI2MDEwMTAwMDAwMFoXDTMwMDEwMTAwMDAwMFowHzEd
MBsGA1UEAxMURGV2S2l0IExvY2FsIEV4YW1wbGUwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAAQqwjjy46loKJ2GXS9C2PkvA2dFIEL1TpbHD4jxUKNcPfH840lOjjsr
1Qa6kkeDBfx5J4y7qO1vsrKclfqVBnRgowIwADAKBggqhkjOPQQDAgNHADBEAiAe
CLPCu+OxFTKOEK3V/WML/lNTfo93AUfJCXisB7M0ZwIgITTls5+rOLtLTOQ1cpsZ
sygTFIKp3UCc1qfaRpwdesc=
-----END CERTIFICATE-----
```

## 时间与日期

### `timestamp` · 时间戳转换

**状态**：已实现。**路由**：`/tools/timestamp`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：秒、毫秒和 ISO 时间，支持批量。
- **输入**：逐行数值时间戳或带时区 ISO 时间。
- **输出**：秒、毫秒、UTC、本地时间和推断单位。
- **使用注解与限制**：auto 按绝对值 >= 1e11 推断毫秒，否则秒，可手动覆盖。支持 0 和负数；ISO 输入需带 Z 或显式偏移。
- **实现**：[time.ts](../src/tools/time.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称   | 默认值   | 可选值或类型      |
| ------------------- | -------- | ----------------- |
| `unit` · 时间戳单位 | `"auto"` | `auto`、`s`、`ms` |

**示例输入**：

```text
1700000000
0
-1
```

### `timezone` · 时区转换

**状态**：已实现。**路由**：`/tools/timezone`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：使用 IANA 时区处理跨时区时间。
- **输入**：标准日期时间与 IANA 时区。
- **输出**：来源、目标和 UTC 时间。
- **使用注解与限制**：不猜歧义日期。无偏移时间按 fromZone 解释，带偏移时间代表确定瞬间；DST 重复或不存在的本地时间拒绝。
- **实现**：[time.ts](../src/tools/time.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值                   | 可选值或类型 |
| --------------------- | ------------------------ | ------------ |
| `fromZone` · 来源时区 | 系统 IANA 时区（运行时） | 文本         |
| `toZone` · 目标时区   | `"UTC"`                  | 文本         |

**示例输入**：

```text
2026-10-28T09:00:00
```

### `date-calculator` · 日期计算

**状态**：已实现。**路由**：`/tools/date-calculator`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：区分日历日期加减与实际时长。
- **输入**：标准日期时间或秒数。
- **输出**：日期加减、时间差或单位换算。
- **使用注解与限制**：calendar 的 amount 为整数天，duration 为秒；difference 使用 endDate；convert 以 86400 秒为一日，不等同跨 DST 的日历一天。
- **实现**：[time.ts](../src/tools/time.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值                   | 可选值或类型                                    |
| --------------------- | ------------------------ | ----------------------------------------------- |
| `mode` · 模式         | `"calendar"`             | `calendar`、`duration`、`difference`、`convert` |
| `fromZone` · 来源时区 | 系统 IANA 时区（运行时） | 文本                                            |
| `amount` · 数量       | `"1"`                    | 数字，范围见说明与运行校验                      |
| `endDate` · 结束时间  | `"2026-10-29T09:00:00"`  | 文本                                            |

**示例输入**：

```text
2026-10-28T09:00:00
```

### `cron` · Cron 表达式

**状态**：已实现。**路由**：`/tools/cron`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：五段或六段表达式的未来 10 次时间。
- **输入**：五段或开启 seconds 后的六段 Cron。
- **输出**：指定时区未来 10 次时间和双语描述。
- **使用注解与限制**：不支持 Quartz 的 ? / L / W / # / @，日和周采用标准 OR 语义。未来时间相对运行时刻计算，不是固定快照。
- **实现**：[time.ts](../src/tools/time.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称        | 默认值  | 可选值或类型 |
| ------------------------ | ------- | ------------ |
| `seconds` · 六段（含秒） | `false` | 布尔值       |
| `toZone` · 目标时区      | `"UTC"` | 文本         |

**示例输入**：

```text
*/15 * * * *
```

### `date-workbench` · 时间与日期工作台

**状态**：已实现。**路由**：`/tools/date-workbench`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：时间与日期工作台。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：同一明确时刻跨时区比较，或计算距离目标的秒数快照。倒计时面板实时更新并可暂停，导出为运行时快照；日期差与日期计算继续使用原有日期工具。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键    | 默认值                        | 可选值或类型         |
| --------- | ----------------------------- | -------------------- |
| `mode`    | `"zones"`                     | `zones`、`countdown` |
| `instant` | `"2026-10-29T12:00:00+08:00"` | text                 |

**示例输入**：

```text
["Asia/Shanghai","America/New_York","Europe/London"]
```

## 代码与文本

### `code-formatter` · 代码格式化

**状态**：已实现。**路由**：`/tools/code-formatter`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：格式化 JS、TS、HTML、CSS、SQL 和 Markdown，提供 Markdown 预览。
- **输入**：指定语言的代码或 Markdown。
- **输出**：格式化代码，Markdown 附隔离预览。
- **使用注解与限制**：支持 JS / TS / HTML / CSS / SQL / Markdown，SQL 默认 PostgreSQL。Markdown 预览移除脚本、外部资源和交互内容，复制下载仍是格式化 Markdown。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称    | 默认值         | 可选值或类型                                                 |
| -------------------- | -------------- | ------------------------------------------------------------ |
| `language` · 语言    | `"javascript"` | `javascript`、`typescript`、`html`、`css`、`sql`、`markdown` |
| `dialect` · SQL 方言 | `"postgresql"` | `postgresql`、`mysql`、`sqlite`、`sql`                       |
| `indent` · 缩进      | `"2"`          | `2`、`4`、`tab`                                              |

**示例输入**：

```text
const greeting={name:"DevKit",tools:[1,2,3]};
```

### `code-minifier` · 代码压缩

**状态**：已实现。**路由**：`/tools/code-minifier`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：保留语义，压缩 JavaScript、HTML 与 CSS。
- **输入**：JS、HTML 或 CSS。
- **输出**：压缩代码和体积统计。
- **使用注解与限制**：不执行 JS；HTML 保留可能影响显示的空白，不内联压缩脚本和样式；不保证每个输入都缩小。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值         | 可选值或类型                |
| ----------------- | -------------- | --------------------------- |
| `language` · 语言 | `"javascript"` | `javascript`、`html`、`css` |

**示例输入**：

```text
function greet(name) { return "Hello, " + name; }
```

### `js-obfuscator` · JavaScript 混淆

**状态**：已实现。**路由**：`/tools/js-obfuscator`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：可配置的本地代码混淆，不执行输入。
- **输入**：JavaScript 源码。
- **输出**：混淆 JS。
- **使用注解与限制**：light / standard 控制预设，可选 compact / stringArray。使用 browser-no-eval 输出；混淆不是加密，可能增加体积和运行成本，不承诺可还原。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称          | 默认值    | 可选值或类型        |
| -------------------------- | --------- | ------------------- |
| `preset` · 预设            | `"light"` | `light`、`standard` |
| `compact` · 紧凑输出       | `true`    | 布尔值              |
| `stringArray` · 字符串数组 | `false`   | 布尔值              |

**示例输入**：

```text
function greet(name) { return "Hello, " + name; }
```

### `text-diff` · 文本对比

**状态**：已实现。**路由**：`/tools/text-diff`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：比较行、字符和换行符差异。
- **输入**：两份文本。
- **输出**：行或字符级变更报告。
- **使用注解与限制**：可忽略空格和大小写，报告 CRLF / LF。总 UTF-8 大小超过 100000 字节时字符模式降级为行模式，并在结果标注。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称         | 默认值   | 可选值或类型        |
| ------------------------- | -------- | ------------------- |
| `mode` · 模式             | `"line"` | `line`、`character` |
| `ignoreSpace` · 忽略空白  | `false`  | 布尔值              |
| `ignoreCase` · 忽略大小写 | `false`  | 布尔值              |

**示例输入**：

```text
Hello DevKit
Local tools

```

### `regex` · 正则测试

**状态**：已实现。**路由**：`/tools/regex`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：匹配、捕获组与替换预览，支持超时。
- **输入**：文本、JavaScript 正则和 flags。
- **输出**：匹配位置、捕获组、命名组、索引和替换预览。
- **使用注解与限制**：最多 10000 条匹配，Worker 超时 1 秒终止；不执行正则以外的 JavaScript，不直接把替换结果应用到输入。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称        | 默认值                     | 可选值或类型 |
| ------------------------ | -------------------------- | ------------ |
| `pattern` · 表达式       | `"([\\w.+-]+)@([\\w.-]+)"` | 文本         |
| `flags` · 标志           | `"g"`                      | 文本         |
| `replacement` · 替换文本 | `"$1 [at] $2"`             | 文本         |

**示例输入**：

```text
hello@example.com
team@devkit.local
```

### `text-batch` · 文本批处理

**状态**：已实现。**路由**：`/tools/text-batch`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：按指定顺序去重、排序和清理文本。
- **输入**：逐行文本。
- **输出**：按步骤处理的文本。
- **使用注解与限制**：steps 按逗号顺序执行 trim / empty / unique / sort / reverse / prefix / suffix；去重保留首次出现，可预览后应用到输入。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称              | 默认值                | 可选值或类型 |
| ------------------------------ | --------------------- | ------------ |
| `steps` · 处理顺序（逗号分隔） | `"trim,empty,unique"` | 文本         |
| `prefix` · 前缀                | `""`                  | 文本         |
| `suffix` · 后缀                | `""`                  | 文本         |

**示例输入**：

```text
 apple
banana
apple

cherry
```

### `string-case` · 字符串转换

**状态**：已实现。**路由**：`/tools/string-case`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：命名风格、转义与换行转换。
- **输入**：文本。
- **输出**：大小写、转义或换行结果。
- **使用注解与限制**：camel / Pascal / snake / kebab 按单词拆分；LF / CRLF 统一换行。界面字符数为码点，不等同视觉字形数。
- **实现**：[text.ts](../src/tools/text.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值        | 可选值或类型                                                                                                        |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `mode` · 模式     | `"camelCase"` | `camelCase`、`PascalCase`、`snake_case`、`kebab-case`、`UPPERCASE`、`lowercase`、`escape`、`unescape`、`LF`、`CRLF` |

**示例输入**：

```text
hello wonderful world
```

### `env-diff` · 环境配置对比

**状态**：已实现。**路由**：`/tools/env-diff`。**持久草稿**：禁用。

- **用途**：对比 .env 缺失项与差异，生成无敏感值的示例配置。
- **输入**：两份 .env 文本。
- **输出**：缺失项、变更键和相同计数，或 .env.example。
- **使用注解与限制**：支持 export、单双引号、多行引用和注释，不展开 ${VAR}。重复键、未闭合引用报错；showValues 默认关闭，生成示例不保留值。
- **实现**：[inspect.ts](../src/tools/inspect.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称         | 默认值      | 可选值或类型             |
| ------------------------- | ----------- | ------------------------ |
| `mode` · 模式             | `"compare"` | `compare`、`env-example` |
| `showValues` · 显示配置值 | `false`     | 布尔值                   |

**示例输入**：

```text
API_URL=https://example.test
API_TOKEN=example
DEBUG=true
```

### `text-encoding` · 文本编码检查与转换

**状态**：已实现。**路由**：`/tools/text-encoding`。**持久草稿**：禁用。

- **用途**：检查 BOM、换行与隐藏字符，转换 UTF-8、UTF-16 和 GBK。
- **输入**：文本或指定源编码的本地文件。
- **输出**：BOM、换行、隐藏字符报告，或转码文本及字节文件。
- **使用注解与限制**：支持 UTF-8 / UTF-16LE / UTF-16BE / GBK，源编码手动选。无法表示的字符、非法源序列和孤立代理单元拒绝。复制为 Unicode，下载编码文件才使用目标编码；隐藏字符明细最多前 500 项。
- **实现**：[encoding.ts](../src/tools/encoding.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称                         | 默认值       | 可选值或类型                           |
| ----------------------------------------- | ------------ | -------------------------------------- |
| `mode` · 模式                             | `"inspect"`  | `inspect`、`convert`                   |
| `sourceEncoding` · 文件源编码（手动选择） | `"utf-8"`    | `utf-8`、`gbk`、`utf-16le`、`utf-16be` |
| `targetEncoding` · 文件输出编码           | `"utf-8"`    | `utf-8`、`gbk`、`utf-16le`、`utf-16be` |
| `newline` · 换行符                        | `"preserve"` | `preserve`、`LF`、`CRLF`               |
| `bom` · 输出添加 BOM                      | `false`      | 布尔值                                 |

**示例输入**：

```text
Hello 世界
DevKit​
```

### `text-analyzer` · 文本统计与重复分析

**状态**：已实现。**路由**：`/tools/text-analyzer`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：文本统计与重复分析。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：统计 Unicode 字符、UTF-8 字节、单词片段、行数与重复行。分组报告最多 10000 项；分词采用字母数字片段，不是中文语义分词。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

`mode` 默认 `statistics`，可选 `statistics` / `extract` / `group`。`extractFields` 默认 `"name,email"`，`groupKey` 默认 `"team"`，`sumKey` 默认 `""`。提取和分组模式输入 JSON 对象数组，最多 10000 行；分组可附加数值字段求和。

**示例输入**：

```text
apple
banana
apple
你好 DevKit
```

### `markdown-workbench` · Markdown 工作台

**状态**：已实现。**路由**：`/tools/markdown-workbench`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：Markdown 工作台。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：实时预览 Markdown，导出安全 HTML，通过浏览器打印保存 PDF；标题生成目录。预览移除脚本、外链资源与表单，不加载远程图片，不支持执行代码。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

**示例输入**：

```text
# DevKit

本地 Markdown 工作台。

## Features

- Live preview
- HTML export
- Print to PDF
```

### `text-cleaner` · 文本清洗

**状态**：已实现。**路由**：`/tools/text-cleaner`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：文本清洗。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：清理行首尾空格、空行与重复行，Unicode NFC/NFKC 规范化，常用中文标点转 ASCII。NFKC 会改变全角等兼容字符。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键          | 默认值       | 可选值或类型          |
| --------------- | ------------ | --------------------- |
| `normalization` | `"none"`     | `none`、`NFC`、`NFKC` |
| `trimLines`     | `true`       | checkbox              |
| `removeBlank`   | `false`      | checkbox              |
| `unique`        | `false`      | checkbox              |
| `punctuation`   | `"preserve"` | `preserve`、`ascii`   |

**示例输入**：

```text
  Hello DevKit

Ｈｅｌｌｏ，世界！
Hello DevKit
```

### `document-diff` · 文档内容对比

**状态**：已实现。**路由**：`/tools/document-diff`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：文档内容对比。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：文本按行或词比较，导出差异；可粘贴 CSV/表格提取文本比较。不是 DOCX/PDF 二进制文档或排版对比。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键 | 默认值    | 可选值或类型     |
| ------ | --------- | ---------------- |
| `mode` | `"lines"` | `lines`、`words` |

**示例输入**：

```text
DevKit
Local tools

```

### `subtitle-tools` · 字幕格式与时间轴

**状态**：已实现。**路由**：`/tools/subtitle-tools`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：字幕格式与时间轴。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：SRT/VTT 互转、时间整体偏移、按完全相同时间轴合并双语字幕。负时间拒绝；不保留 VTT 样式、定位与提示 ID，不支持复杂 NOTE/STYLE 块。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值      | 可选值或类型       |
| -------- | ----------- | ------------------ |
| `mode`   | `"convert"` | `convert`、`merge` |
| `format` | `"srt"`     | `srt`、`vtt`       |
| `offset` | `0`         | number             |

**示例输入**：

```text
1
00:00:01,000 --> 00:00:03,000
Hello DevKit

```

### `text-redact` · 文本脱敏

**状态**：已实现。**路由**：`/tools/text-redact`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：文本脱敏。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按规则替换邮箱、中国大陆手机号、18 位身份证样式及常见 token/password 字段。规则可能漏报或误报，分享前检查；不保存草稿。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键     | 默认值 | 可选值或类型 |
| ---------- | ------ | ------------ |
| `email`    | `true` | checkbox     |
| `phone`    | `true` | checkbox     |
| `identity` | `true` | checkbox     |
| `token`    | `true` | checkbox     |

**示例输入**：

```text
email=ada@example.com
phone=13800138000
token=demo-secret
```

## CSS 与视觉

### `color` · 颜色工作台

**状态**：已实现。**路由**：`/tools/color`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：颜色转换、透明度与 WCAG 对比度。
- **输入**：颜色、对比颜色和背景。
- **输出**：HEX、RGB、HSL、WCAG 比率及预览。
- **使用注解与限制**：透明色先合成到指定不透明背景；AA 正常文字阈值 4.5:1、大字 3:1。EyeDropper 不可用仍可手输；单个比率不等于页面通过 WCAG。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称       | 默认值      | 可选值或类型 |
| ----------------------- | ----------- | ------------ |
| `contrast` · 对比颜色   | `"#ffffff"` | 文本         |
| `background` · 背景颜色 | `"#ffffff"` | 文本         |

**示例输入**：

```text
#0066cc
```

### `gradient` · 渐变生成器

**状态**：已实现。**路由**：`/tools/gradient`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：多色标渐变，实时预览和 CSS。
- **输入**：可视色标或 stops 配置。
- **输出**：linear、radial 或 conic CSS 与预览。
- **使用注解与限制**：支持 2–20 个色标，位置 0–100%；position 使用百分比坐标。不加载用户指定的外部资源。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称                     | 默认值                                    | 可选值或类型                |
| ------------------------------------- | ----------------------------------------- | --------------------------- |
| `mode` · 模式                         | `"linear"`                                | `linear`、`radial`、`conic` |
| `stops` · 色标（颜色 位置，逗号分隔） | `"#0066cc 0%, #8b5cf6 55%, #ec4899 100%"` | 文本                        |
| `angle` · 角度                        | `"135"`                                   | 数字，范围见说明与运行校验  |
| `position` · 位置                     | `"50% 50%"`                               | 文本                        |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `shadow` · 阴影生成器

**状态**：已实现。**路由**：`/tools/shadow`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：编辑多层阴影，预览和复制 CSS。
- **输入**：阴影层 JSON 或可视列表。
- **输出**：多层 box-shadow CSS 和预览。
- **使用注解与限制**：支持 inset、偏移、模糊、扩展、颜色；非空数组最多 30 层，预览背景可设置。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称         | 默认值                                                                                                                                                       | 可选值或类型         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `layers` · 阴影层（JSON） | `"[{\"x\":0,\"y\":12,\"blur\":32,\"spread\":-8,\"color\":\"#0066cc55\",\"inset\":false},{\"x\":0,\"y\":2,\"blur\":6,\"spread\":0,\"color\":\"#00000012\"}]"` | 多行文本 / JSON 配置 |
| `background` · 背景颜色   | `"#f0f1f4"`                                                                                                                                                  | 文本                 |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `radius` · 圆角生成器

**状态**：已实现。**路由**：`/tools/radius`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：独立四角与椭圆圆角预览。
- **输入**：四角及纵向半径、预览尺寸。
- **输出**：border-radius CSS 和预览。
- **使用注解与限制**：支持 px / %、联动与独立四角；百分比受盒子宽高影响，椭圆半径通过 vertical 设置。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称             | 默认值          | 可选值或类型               |
| ----------------------------- | --------------- | -------------------------- |
| `corners` · 四角半径          | `"24 48 24 48"` | 文本                       |
| `vertical` · 垂直半径（可选） | `""`            | 文本                       |
| `unit` · 时间戳单位           | `"px"`          | `px`、`%`                  |
| `width` · 最大宽度（px）      | `"280"`         | 数字，范围见说明与运行校验 |
| `height` · 最大高度（px）     | `"180"`         | 数字，范围见说明与运行校验 |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `flex` · Flex 演练

**状态**：已实现。**路由**：`/tools/flex`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：交互调整容器与子项，导出代码。
- **输入**：容器参数和子项 JSON 或可视列表。
- **输出**：CSS、配套 HTML 和预览。
- **使用注解与限制**：支持 grow / shrink / basis / order / alignSelf；值受校验，不执行任意 HTML 或 CSS 脚本。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称          | 默认值                                                                                                                                                                          | 可选值或类型                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `direction` · 方向         | `"row"`                                                                                                                                                                         | `row`、`column`、`row-reverse`、`column-reverse`                                    |
| `wrap` · 换行              | `"wrap"`                                                                                                                                                                        | `wrap`、`nowrap`、`wrap-reverse`                                                    |
| `justify` · 主轴对齐       | `"flex-start"`                                                                                                                                                                  | `flex-start`、`center`、`flex-end`、`space-between`、`space-around`、`space-evenly` |
| `align` · 交叉轴对齐       | `"stretch"`                                                                                                                                                                     | `stretch`、`center`、`flex-start`、`flex-end`、`baseline`                           |
| `gap` · 间距               | `"12"`                                                                                                                                                                          | 数字，范围见说明与运行校验                                                          |
| `items` · 子项配置（JSON） | `"[{\"grow\":0,\"shrink\":1,\"basis\":\"80px\",\"order\":0,\"alignSelf\":\"auto\"},{\"grow\":1,\"shrink\":1,\"basis\":\"80px\"},{\"grow\":0,\"shrink\":1,\"basis\":\"80px\"}]"` | 多行文本 / JSON 配置                                                                |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `grid` · Grid 生成器

**状态**：已实现。**路由**：`/tools/grid`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：轨道、区域和跨行跨列布局。
- **输入**：轨道、gap、区域名和子项位置。
- **输出**：Grid CSS、HTML 和预览。
- **使用注解与限制**：3×3 可视选区用于快捷编辑；columns / rows / areas / placement 支持高级配置，不宣称完整可视布局编辑器。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称              | 默认值                                                                                                               | 可选值或类型               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `columns` · 列轨道             | `"repeat(3, 1fr)"`                                                                                                   | 文本                       |
| `rows` · 行轨道                | `"repeat(2, 90px)"`                                                                                                  | 文本                       |
| `gap` · 间距                   | `"12"`                                                                                                               | 数字，范围见说明与运行校验 |
| `areas` · 命名区域             | `""`                                                                                                                 | 文本                       |
| `placement` · 子项位置（JSON） | `"[{\"column\":\"1 / 3\",\"row\":\"1\"},{\"column\":\"3\",\"row\":\"1 / 3\"},{\"column\":\"1 / 3\",\"row\":\"2\"}]"` | 多行文本 / JSON 配置       |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `css-units` · CSS 单位换算

**状态**：已实现。**路由**：`/tools/css-units`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：在显式上下文中转换 px/rem/em/vw/vh。
- **输入**：数字及尺寸上下文。
- **输出**：px、rem、em、vw、vh 换算文本。
- **使用注解与限制**：rootSize / parentSize / viewportWidth / viewportHeight 决定比例，最多保留 6 位小数，不读取用户其他网页布局。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称           | 默认值   | 可选值或类型                  |
| --------------------------- | -------- | ----------------------------- |
| `fromUnit` · 来源单位       | `"px"`   | `px`、`rem`、`em`、`vw`、`vh` |
| `toUnit` · 目标单位         | `"rem"`  | `rem`、`px`、`em`、`vw`、`vh` |
| `rootSize` · 根字号         | `"16"`   | 数字，范围见说明与运行校验    |
| `parentSize` · 父字号       | `"16"`   | 数字，范围见说明与运行校验    |
| `viewportWidth` · 视口宽度  | `"1440"` | 数字，范围见说明与运行校验    |
| `viewportHeight` · 视口高度 | `"900"`  | 数字，范围见说明与运行校验    |

**示例输入**：

```text
16
```

### `animation` · 动画与缓动

**状态**：已实现。**路由**：`/tools/animation`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：编辑关键帧与曲线，预览动画。
- **输入**：关键帧 JSON 或可视列表和动画参数。
- **输出**：keyframes、调用 CSS 与预览。
- **使用注解与限制**：支持受限 transform / opacity 等值；bezier 的 x 控制点在 0–1。可暂停和重置，减少动态效果设置下默认暂停。
- **实现**：[visual.ts](../src/tools/visual.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称            | 默认值                                                                                                                                                         | 可选值或类型                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `duration` · 时长（秒）      | `"1.5"`                                                                                                                                                        | 数字，范围见说明与运行校验                            |
| `delay` · 延迟（秒）         | `"0"`                                                                                                                                                          | 数字，范围见说明与运行校验                            |
| `iterations` · 循环次数      | `"infinite"`                                                                                                                                                   | 文本                                                  |
| `direction` · 方向           | `"alternate"`                                                                                                                                                  | `alternate`、`normal`、`reverse`、`alternate-reverse` |
| `fill` · 填充模式            | `"both"`                                                                                                                                                       | `both`、`none`、`forwards`、`backwards`               |
| `bezier` · 贝塞尔控制点      | `"0.4, 0, 0.2, 1"`                                                                                                                                             | 文本                                                  |
| `keyframes` · 关键帧（JSON） | `"[{\"offset\":0,\"transform\":\"translateX(-60px) scale(0.8)\",\"opacity\":0.4},{\"offset\":100,\"transform\":\"translateX(60px) scale(1)\",\"opacity\":1}]"` | 多行文本 / JSON 配置                                  |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `svg-tools` · SVG 优化与转换

**状态**：已实现。**路由**：`/tools/svg-tools`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：清理并优化 SVG，转换为 JSX 或 Data URI。
- **输入**：SVG 文本或 UTF-8 文件。
- **输出**：优化 SVG、React JSX 或 Data URI 及图片预览。
- **使用注解与限制**：输入最多 512 KiB，Worker 内优化。拒绝 DTD / 实体，移除脚本、样式、foreignObject 和外部引用；清理可能改变外观，需核对。
- **实现**：[browser.ts](../src/tools/browser.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称 | 默认值       | 可选值或类型                  |
| ----------------- | ------------ | ----------------------------- |
| `mode` · 模式     | `"optimize"` | `optimize`、`jsx`、`data-uri` |

**示例输入**：

```text
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#0066cc" /></svg>
```

### `image-css` · 图片 → Base64 / CSS

**状态**：已实现。**路由**：`/tools/image-css`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片 → Base64 / CSS。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：本地 PNG/JPEG/WebP/GIF/AVIF 转 Data URI 或 CSS background-image；单文件最多 5 MiB，不执行 SVG。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键 | 默认值       | 可选值或类型      |
| ------ | ------------ | ----------------- |
| `mode` | `"data-uri"` | `data-uri`、`css` |

### `css-converter` · CSS 与对象转换

**状态**：已实现。**路由**：`/tools/css-converter`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：CSS 与对象转换。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：输入 CSS 声明列表或 JSON 样式对象；支持驼峰转换、px→rem 和属性排序。CSS→对象拒绝重复属性与 !important；不执行 JavaScript。仅声明列表，不接受完整样式表。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键     | 默认值        | 可选值或类型                               |
| ---------- | ------------- | ------------------------------------------ |
| `mode`     | `"css-to-js"` | `css-to-js`、`js-to-css`、`px-rem`、`sort` |
| `rootSize` | `16`          | number                                     |

**示例输入**：

```text
font-size: 16px; margin-top: 24px; color: #0066cc;
```

### `font-preview` · 本地字体预览

**状态**：已实现。**路由**：`/tools/font-preview`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：本地字体预览。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：导入本地 WOFF/WOFF2/TTF/OTF，实时调整字号、字重与行高；最大 10 MiB。切页释放字体，不上传或安装系统字体。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键       | 默认值 | 可选值或类型 |
| ------------ | ------ | ------------ |
| `fontSize`   | `36`   | number       |
| `fontWeight` | `400`  | number       |
| `lineHeight` | `1.6`  | number       |

**示例输入**：

```text
DevKit Aa Bb Cc
你好，世界！0123456789
```

### `pixel-editor` · 像素画编辑器

**状态**：已实现。**路由**：`/tools/pixel-editor`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：像素画编辑器。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：点击网格画点、选色或擦除；支持编辑正方形颜色矩阵，最大 32×32，导出 PNG 与 box-shadow CSS。空白网格为 16×16，缩放 1–40。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值 | 可选值或类型 |
| ------- | ------ | ------------ |
| `scale` | `20`   | number       |

**示例输入**：

```text
[["#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc"],["transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent"],["transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent"],["transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent"],["transparent","transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent","transparent"],["transparent","transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent","transparent"],["transparent","#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc","transparent"],["#0066cc","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","transparent","#0066cc"]]
```

### `code-card` · 代码卡片

**状态**：已实现。**路由**：`/tools/code-card`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：代码卡片。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：本地语法高亮、行号、窗口标题与背景，导出 PNG。最多 300 行/50000 字符；长行受画布上限约束，不执行代码。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键       | 默认值         | 可选值或类型                                                       |
| ------------ | -------------- | ------------------------------------------------------------------ |
| `language`   | `"javascript"` | `javascript`、`typescript`、`json`、`css`、`html`、`python`、`sql` |
| `fontSize`   | `18`           | number                                                             |
| `padding`    | `40`           | number                                                             |
| `title`      | `"DevKit"`     | text                                                               |
| `background` | `"#0066cc"`    | text                                                               |

**示例输入**：

```text
const greeting = "Hello, DevKit!";
console.log(greeting);
```

## URL 与接口

### `url-parser` · URL 解析与构建

**状态**：已实现。**路由**：`/tools/url-parser`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：解析、构建与对比网址，保留有序和重复参数。
- **输入**：URL，对比模式补充第二 URL。
- **输出**：结构、原始与解码参数，或组件及参数差异。
- **使用注解与限制**：支持 http / https / ftp / file。parse 可编辑组件，params 为有序二元组 JSON，需 reencode 才重编码；compare 保留重复参数和顺序差异。不访问 URL。
- **实现**：[web.ts](../src/tools/web.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称               | 默认值    | 可选值或类型         |
| ------------------------------- | --------- | -------------------- |
| `mode` · 模式                   | `"parse"` | `parse`、`compare`   |
| `protocol` · 协议（可选）       | `""`      | 文本                 |
| `hostname` · 主机名（可选）     | `""`      | 文本                 |
| `port` · 端口（可选）           | `""`      | 文本                 |
| `pathname` · 路径（可选）       | `""`      | 文本                 |
| `fragment` · 片段（可选）       | `""`      | 文本                 |
| `params` · 参数对（JSON，可选） | `""`      | 多行文本 / JSON 配置 |
| `reencode` · 显式重新编码       | `false`   | 布尔值               |

**示例输入**：

```text
https://example.com:8080/path?q=hello&q=world#section
```

### `curl-converter` · cURL 转代码

**状态**：已实现。**路由**：`/tools/curl-converter`。**持久草稿**：禁用。

- **用途**：将常用 POSIX、Windows CMD 或 PowerShell cURL 转成客户端代码。
- **输入**：常见 POSIX、CMD 或 PowerShell cURL。
- **输出**：Fetch、Axios、Python Requests 或请求 JSON。
- **使用注解与限制**：支持 method / header / data / --url、CMD 转义和 PowerShell 字面参数；文件上传、重复 header、动态表达式和未实现 flag 拒绝。脱敏按常见字段名，分享前核对；生成代码运行仍受浏览器跨域和请求头限制。
- **实现**：[web.ts](../src/tools/web.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值    | 可选值或类型                               |
| --------------------- | --------- | ------------------------------------------ |
| `target` · 目标代码   | `"fetch"` | `fetch`、`axios`、`python`、`request-json` |
| `redact` · 隐藏敏感值 | `false`   | 布尔值                                     |

**示例输入**：

```text
curl 'https://example.com/api' -X POST -H 'Content-Type: application/json' -d '{"name":"DevKit"}'
```

### `http-reference` · HTTP 速查

**状态**：已实现。**路由**：`/tools/http-reference`。**持久草稿**：不适用。

- **用途**：离线检索状态码、请求头与媒体类型。
- **输入**：状态码或关键词搜索。
- **输出**：HTTP 状态码、请求头、Content-Type 说明。
- **使用注解与限制**：只读速查，条目有标准来源；不探测远端服务，不执行转换，不提供通用结果导出。
- **实现**：[Reference.tsx](../src/tools/Reference.tsx)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**：无独立参数；按页面输入或速查搜索使用。

**示例入口**：搜索条目，无转换输入。

### `request-params` · 请求参数转换

**状态**：已实现。**路由**：`/tools/request-params`。**持久草稿**：禁用。

- **用途**：Query String、JSON、表单键值对互转，保留重复参数。
- **输入**：Query String、JSON、键值行或有序键值数组。
- **输出**：JSON、Query String、键值行或 pairs。
- **使用注解与限制**：JSON 重复参数分组为数组，pairs 保留全局顺序；嵌套 JSON 不猜表单结构。非法百分号和 UTF-8 拒绝；键值行会 Trim 名和值，不适合保留边缘空白。
- **实现**：[inspect.ts](../src/tools/inspect.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称         | 默认值    | 可选值或类型                          |
| ------------------------- | --------- | ------------------------------------- |
| `sourceFormat` · 输入格式 | `"query"` | `query`、`json`、`key-value`、`pairs` |
| `outputFormat` · 输出格式 | `"json"`  | `json`、`query`、`key-value`、`pairs` |

**示例输入**：

```text
name=DevKit&tag=local&tag=private
```

### `har-analyzer` · HAR 请求分析

**状态**：已实现。**路由**：`/tools/har-analyzer`。**持久草稿**：禁用。

- **用途**：本地分析请求耗时、错误、重复请求及响应大小。
- **输入**：HAR JSON 文本或文件。
- **输出**：请求、错误、耗时与大小排名、重复请求。
- **使用注解与限制**：最多 50000 项，count 为 1–500；默认去掉查询和片段，不输出 header / 正文。重复请求按完整原始 URL 分组；content.size 是解压后内容大小，不是网络传输量，未知 -1 不计负数。
- **实现**：[inspect.ts](../src/tools/inspect.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值 | 可选值或类型               |
| --------------------- | ------ | -------------------------- |
| `count` · 生成条数    | `"10"` | 数字，范围见说明与运行校验 |
| `redact` · 隐藏敏感值 | `true` | 布尔值                     |

**示例输入**：

```json
{
  "log": {
    "entries": [
      {
        "request": { "method": "GET", "url": "https://example.test/api?q=1" },
        "response": { "status": 200, "content": { "size": 1024 } },
        "time": 125,
        "timings": { "wait": 100, "receive": 25 }
      }
    ]
  }
}
```

### `request-converter` · 请求代码互转

**状态**：已实现。**路由**：`/tools/request-converter`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：请求代码互转。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：支持 cURL、字面量 fetch 与 axios(config)，输出 fetch/Axios/cURL/Python；不执行请求。支持 axios.get/post 等常见快捷方法；拒绝变量、模板表达式和未支持的选项；不会自动脱敏。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值    | 可选值或类型                       |
| -------- | --------- | ---------------------------------- |
| `target` | `"fetch"` | `fetch`、`axios`、`curl`、`python` |

**示例输入**：

```text
fetch("https://example.com/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({name:"Ada"}) });
```

### `openapi` · OpenAPI 代码生成

**状态**：已实现。**路由**：`/tools/openapi`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：OpenAPI 代码生成。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：支持 OpenAPI 3.x JSON 的组件类型、本地 schemas 引用与请求骨架；不解析 YAML、外部引用，不自动填充路径、鉴权、请求体或生成完整 SDK。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[developer-tools.ts](../src/tools/developer-tools.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键 | 默认值    | 可选值或类型        |
| ------ | --------- | ------------------- |
| `mode` | `"types"` | `types`、`requests` |

**示例输入**：

```text
{"openapi":"3.0.3","components":{"schemas":{"User":{"type":"object","required":["id"],"properties":{"id":{"type":"integer"},"name":{"type":"string"}}}}},"paths":{"/users":{"get":{"operationId":"listUsers"}}}}
```

### `websocket` · WebSocket 调试

**状态**：已实现。**路由**：`/tools/websocket`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：WebSocket 调试。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：仅点击连接后与填写的服务器通信；HTTPS 页面使用 wss。浏览器不能自定义握手 Headers，受服务器来源策略限制。日志只留在内存，最多 200 条；切页断开。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

### `link-tools` · 链接工具箱

**状态**：已实现。**路由**：`/tools/link-tools`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：链接工具箱。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：从文本提取 HTTP(S) 链接或批量追加查询参数，保留已有重复参数；不访问目标地址。解析与二维码沿用原有工具。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值                | 可选值或类型        |
| ------- | --------------------- | ------------------- |
| `mode`  | `"extract"`           | `extract`、`append` |
| `query` | `"utm_source=devkit"` | text                |

**示例输入**：

```text
https://example.com/docs?lang=zh
https://example.com/tools
```

### `browser-check` · 浏览器环境体检

**状态**：已实现。**路由**：`/tools/browser-check`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：浏览器环境体检。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：查看浏览器、视口、能力、存储估计和已知权限状态；不弹权限申请，不上传报告。信息可能暴露设备特征，分享前检查。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

## 生成器与数值

### `random` · UUID / 随机字符串

**状态**：已实现。**路由**：`/tools/random`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：使用安全随机数，支持批量生成。
- **输入**：模式、条数、长度和字符集。
- **输出**：UUID v4 或逐行随机字符串。
- **使用注解与限制**：条数 1–1000，长度 1–4096，总字符串量最多 1000000 个字符；字符集去重后 2–256 码点。使用安全随机和拒绝采样，不使用测试数据种子算法。
- **实现**：[generate.ts](../src/tools/generate.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值                                                             | 可选值或类型               |
| --------------------- | ------------------------------------------------------------------ | -------------------------- |
| `mode` · 模式         | `"uuid"`                                                           | `uuid`、`string`           |
| `count` · 生成条数    | `"1"`                                                              | 数字，范围见说明与运行校验 |
| `length` · 字符串长度 | `"24"`                                                             | 数字，范围见说明与运行校验 |
| `charset` · 字符集    | `"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"` | 文本                       |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `radix` · 进制转换

**状态**：已实现。**路由**：`/tools/radix`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：BigInt 无损处理整数与负数。
- **输入**：二、八、十或十六进制整数字符串。
- **输出**：目标进制整数。
- **使用注解与限制**：使用 BigInt，支持负数和大整数，不支持小数和 0x 等前缀；输入基数显式指定。
- **实现**：[generate.ts](../src/tools/generate.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称     | 默认值 | 可选值或类型         |
| --------------------- | ------ | -------------------- |
| `fromBase` · 来源进制 | `"10"` | `10`、`2`、`8`、`16` |
| `toBase` · 目标进制   | `"16"` | `16`、`10`、`2`、`8` |

**示例输入**：

```text
255
```

### `mock-data` · 测试数据

**状态**：已实现。**路由**：`/tools/mock-data`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：配置字段，使用种子生成 JSON / CSV。
- **输入**：可视配置或 schema JSON、种子和条数。
- **输出**：JSON 或带表头 CSV。
- **使用注解与限制**：最多 10000 行、100 字段；支持 id / name / email / integer / boolean / date / string。重复字段拒绝；固定种子可复现，只供测试，不作安全随机或真实身份数据。
- **实现**：[generate.ts](../src/tools/generate.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称           | 默认值                                                                                                                                                                              | 可选值或类型               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `count` · 生成条数          | `"100"`                                                                                                                                                                             | 数字，范围见说明与运行校验 |
| `seed` · 随机种子           | `"devkit"`                                                                                                                                                                          | 文本                       |
| `format` · 格式             | `"json"`                                                                                                                                                                            | `json`、`csv`              |
| `schema` · 字段配置（JSON） | `"[{\"name\":\"id\",\"type\":\"id\"},{\"name\":\"name\",\"type\":\"name\"},{\"name\":\"email\",\"type\":\"email\"},{\"name\":\"age\",\"type\":\"integer\",\"min\":18,\"max\":80}]"` | 多行文本 / JSON 配置       |

**示例入口**：使用默认参数运行，或先通过可视控件配置。

### `qr-code` · 二维码生成与识别

**状态**：已实现。**路由**：`/tools/qr-code`。**持久草稿**：禁用。

- **用途**：生成可下载的 SVG 二维码，识别本地图片。
- **输入**：文本或本地栅格图片。
- **输出**：SVG 二维码与预览，或识别文本。
- **使用注解与限制**：文本最多 2000 UTF-8 字节，容量受纠错级别影响；宽度 128–2048。图片上限同图片工具，识别在 Worker 内；不申请摄像头，不自动打开 URL，可载入本地生成示例。
- **实现**：[browser.ts](../src/tools/browser.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称             | 默认值       | 可选值或类型               |
| ----------------------------- | ------------ | -------------------------- |
| `mode` · 模式                 | `"generate"` | `generate`、`read-qr`      |
| `width` · 二维码宽度（px）    | `"320"`      | 数字，范围见说明与运行校验 |
| `correction` · 二维码纠错级别 | `"M"`        | `M`、`L`、`Q`、`H`         |

**示例输入**：

```text
https://example.com/devkit
```

### `password-generator` · 密码与口令生成

**状态**：已实现。**路由**：`/tools/password-generator`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：密码与口令生成。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：使用 Web Crypto 无偏随机生成密码，启用的字符类至少各含一个；或从内置约百词表生成 4–12 词口令。词表较小，不提供强度认证；不保存草稿。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键    | 默认值       | 可选值或类型             |
| --------- | ------------ | ------------------------ |
| `mode`    | `"password"` | `password`、`passphrase` |
| `count`   | `5`          | number                   |
| `length`  | `20`         | number                   |
| `words`   | `6`          | number                   |
| `lower`   | `true`       | checkbox                 |
| `upper`   | `true`       | checkbox                 |
| `digits`  | `true`       | checkbox                 |
| `symbols` | `true`       | checkbox                 |

## 图片与音视频

### `image-tools` · 图片压缩与转换

**状态**：已实现。**路由**：`/tools/image-tools`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：本地缩放并转换 PNG、JPEG、WebP，比较输出体积。
- **输入**：本地 PNG、JPEG、WebP、GIF、AVIF 或 BMP。
- **输出**：PNG、JPEG、WebP 文件及预览和统计。
- **使用注解与限制**：最多 20 MiB / 3200 万像素，按 width / height 等比缩小、不放大；质量 0.1–1，PNG 通常不受质量参数影响。输出静态帧，不保留原始元数据，JPEG 白底；能力取决于浏览器编码支持。
- **实现**：[browser.ts](../src/tools/browser.ts)；共用界面与调度见 [ToolPage.tsx](../src/tools/ToolPage.tsx)。

**参数**（模式相关参数在对应模式才生效）：

| 参数键 / 界面名称             | 默认值   | 可选值或类型               |
| ----------------------------- | -------- | -------------------------- |
| `format` · 格式               | `"webp"` | `webp`、`jpeg`、`png`      |
| `width` · 最大宽度（px）      | `"1910"` | 数字，范围见说明与运行校验 |
| `height` · 最大高度（px）     | `"1080"` | 数字，范围见说明与运行校验 |
| `quality` · 图片质量（0.1–1） | `"0.8"`  | 数字，范围见说明与运行校验 |

**示例入口**：点击“载入示例”生成本地 PNG，再运行并下载图片。

### `image-batch` · 图片批处理

**状态**：已实现。**路由**：`/tools/image-batch`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片批处理。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：最多 50 张本地图片，等比缩小、格式转换、质量调整、水印与打包下载；序号命名。动画只取静态帧，元数据不保留，JPEG 白底。总解码像素最多 6400 万。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键      | 默认值   | 可选值或类型          |
| ----------- | -------- | --------------------- |
| `format`    | `"webp"` | `webp`、`jpeg`、`png` |
| `width`     | `1910`   | number                |
| `height`    | `1080`   | number                |
| `quality`   | `0.85`   | number                |
| `watermark` | `""`     | text                  |

### `image-stitch` · 图片拼接

**状态**：已实现。**路由**：`/tools/image-stitch`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片拼接。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：横向、纵向或网格拼图；图片等比适配单元格，可设置间距与背景。输出 PNG，单画布最多 3200 万像素。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键       | 默认值      | 可选值或类型                     |
| ------------ | ----------- | -------------------------------- |
| `layout`     | `"grid"`    | `grid`、`vertical`、`horizontal` |
| `columns`    | `2`         | number                           |
| `width`      | `480`       | number                           |
| `height`     | `320`       | number                           |
| `gap`        | `16`        | number                           |
| `background` | `"#ffffff"` | text                             |

### `image-palette` · 图片配色提取

**状态**：已实现。**路由**：`/tools/image-palette`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片配色提取。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：从本地图片提取量化主色、出现次数和渐变 CSS。采样 100×100，忽略低透明像素；近似色板，不是无损颜色统计。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值 | 可选值或类型 |
| ------- | ------ | ------------ |
| `count` | `6`    | number       |

### `image-annotate` · 图片标注

**状态**：已实现。**路由**：`/tools/image-annotate`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片标注。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：通过标注 JSON 添加 rect、arrow、text、number 或 blur（像素化），坐标使用原图像素；也可在预览点击定位。最多 100 项。敏感内容应使用完全遮盖，像素化不能保证不可恢复。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

**示例输入**：

```text
[{"type":"rect","x":40,"y":40,"width":200,"height":100,"color":"#ff3b30"},{"type":"text","x":60,"y":60,"text":"DevKit","color":"#ffffff"}]
```

### `audio-editor` · 音频裁剪与音量

**状态**：已实现。**路由**：`/tools/audio-editor`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：音频裁剪与音量。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：裁剪起止秒数、调节音量、淡入淡出，输出 16-bit PCM WAV。输入格式依浏览器解码能力；输出最多 10 分钟、双声道、3000 万采样。切页/取消丢弃结果。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值 | 可选值或类型 |
| -------- | ------ | ------------ |
| `start`  | `0`    | number       |
| `end`    | `""`   | text         |
| `volume` | `1`    | number       |
| `fade`   | `0`    | number       |

### `video-frames` · 视频截图

**状态**：已实现。**路由**：`/tools/video-frames`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：视频截图。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：输入多个逗号分隔时间点（秒），从本地视频截取 PNG 并打包；最多 30 帧，输出宽度不超过原图。不转换视频格式；解码依浏览器。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值 | 可选值或类型 |
| ------- | ------ | ------------ |
| `times` | `"0"`  | text         |
| `width` | `1280` | number       |

### `ascii-art` · 图片 → ASCII 字符画

**状态**：已实现。**路由**：`/tools/ascii-art`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：图片 → ASCII 字符画。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：本地图片或输入文字按亮度转字符画，宽度 10–200 列；透明处按白色处理。文本可复制下载；中文等宽字符可能影响显示。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键       | 默认值         | 可选值或类型 |
| ------------ | -------------- | ------------ |
| `width`      | `80`           | number       |
| `characters` | `"@%#*+=-:. "` | text         |

### `screenshot-beautify` · 截图美化

**状态**：已实现。**路由**：`/tools/screenshot-beautify`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：截图美化。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：本地截图添加双色渐变背景、圆角、阴影、窗口边框或手机外壳，输出 PNG；不修改截图内容或上传素材。单画布最多 3200 万像素。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键          | 默认值      | 可选值或类型           |
| --------------- | ----------- | ---------------------- |
| `padding`       | `60`        | number                 |
| `radius`        | `16`        | number                 |
| `phoneFrame`    | `false`     | 布尔值，优先于窗口边框 |
| `windowFrame`   | `true`      | checkbox               |
| `background`    | `"#0066cc"` | text                   |
| `backgroundEnd` | `"#10b981"` | text                   |

## 文件与文档

### `pdf-tools` · PDF 工作台

**状态**：已实现。**路由**：`/tools/pdf-tools`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：PDF 工作台。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：按所选文件顺序合并、提取/重排指定页、逐页拆分、页面转 PNG；页码示例 3,1-2。最多 500 个合并页，选择最多 300 页，图片导出最多 30 页。不绕过密码；渲染使用本地 PDF.js。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键  | 默认值    | 可选值或类型                          |
| ------- | --------- | ------------------------------------- |
| `mode`  | `"merge"` | `merge`、`extract`、`split`、`images` |
| `pages` | `""`      | text                                  |
| `scale` | `1.5`     | number                                |

### `file-rename` · 批量重命名

**状态**：已实现。**路由**：`/tools/file-rename`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：批量重命名。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：默认仅显示重命名方案；开启导出副本后下载 ZIP，不修改磁盘原文件。支持序号、字面量或正则替换，重复名/非法 Windows 名称拒绝；正则模式在 Worker 中运行，5 秒超时。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键        | 默认值       | 可选值或类型                   |
| ------------- | ------------ | ------------------------------ |
| `mode`        | `"sequence"` | `sequence`、`replace`、`regex` |
| `prefix`      | `"file-"`    | text                           |
| `start`       | `1`          | number                         |
| `flags`       | `"g"`        | 文本，允许 g / i / u           |
| `find`        | `"old"`      | text                           |
| `replace`     | `"new"`      | text                           |
| `exportFiles` | `false`      | checkbox                       |

### `file-duplicates` · 重复文件检测

**状态**：已实现。**路由**：`/tools/file-duplicates`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：重复文件检测。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：使用分块 SHA-256 对文件内容分组，标注重复项；不删除文件。最多 50 个、单文件 50 MiB、合计 150 MiB。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

### `file-signature` · 文件真实格式识别

**状态**：已实现。**路由**：`/tools/file-signature`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：文件真实格式识别。
- **输入**：按页面选择本地文件或编辑文本；点击载入示例可使用内置示例（字体/视频需自行选择文件）。
- **输出**：预览、文本报告及适用格式的下载；多文件输出打包 ZIP。
- **使用注解与限制**：读取前 32 字节识别常见 PNG/JPEG/GIF/PDF/ZIP/ICO/GZIP/WebP/WAV 魔数并比较扩展名。ZIP 不能进一步区分 Office 类型；未知不等于不安全，不进行病毒扫描。 通用文件上限：50 个、单个 50 MiB、合计 150 MiB；工具专有限制优先。取消/切页丢弃结果，部分浏览器原生解码不能即时中断。
- **实现**：[WorkbenchPage.tsx](../src/tools/WorkbenchPage.tsx)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

## 生活与决策

### `split-bill` · 多人分账

**状态**：已实现。**路由**：`/tools/split-bill`。**持久草稿**：禁用；输入和文件仅保留当前页面会话。

- **用途**：多人分账。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按付款人及参与人均分，金额最多两位小数，余下分币按参与顺序分配。输出余额和转账方案；非零余额人数 ≤12 时搜索最少转账笔数（最多 200 万节点），超过时使用贪心算法。没有支付或汇率功能。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

**示例输入**：

```text
[{"paidBy":"Ada","amount":120,"for":["Ada","Lin","Grace"]},{"paidBy":"Lin","amount":60,"for":["Ada","Lin"]}]
```

### `unit-converter` · 通用单位换算

**状态**：已实现。**路由**：`/tools/unit-converter`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：通用单位换算。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：长度、重量、温度、速度、存储容量换算，只允许同类单位；KB 为十进制，KiB 为二进制。结果 12 位有效数字，不是高精度计量工具。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键     | 默认值 | 可选值或类型                                                                                                                    |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `fromUnit` | `"m"`  | `m`、`km`、`cm`、`inch`、`ft`、`kg`、`g`、`lb`、`C`、`F`、`K`、`m/s`、`km/h`、`mph`、`B`、`KB`、`MB`、`GB`、`KiB`、`MiB`、`GiB` |
| `toUnit`   | `"km"` | `km`、`m`、`cm`、`inch`、`ft`、`kg`、`g`、`lb`、`C`、`F`、`K`、`m/s`、`km/h`、`mph`、`B`、`KB`、`MB`、`GB`、`KiB`、`MiB`、`GiB` |

**示例输入**：

```text
1000
```

### `lottery` · 加权抽签

**状态**：已实现。**路由**：`/tools/lottery`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：加权抽签。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按正整数权重随机抽取，支持不重复；最多 1000 个候选，权重 1–10000。候选可作为 JSON 文本保存；不提供赌博、支付或公平审计服务。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

| 参数键   | 默认值 | 可选值或类型 |
| -------- | ------ | ------------ |
| `count`  | `1`    | number       |
| `unique` | `true` | checkbox     |

**示例输入**：

```text
[{"name":"A","weight":1},{"name":"B","weight":3},{"name":"C","weight":2}]
```

### `decision` · 加权决策评分

**状态**：已实现。**路由**：`/tools/decision`。**持久草稿**：用户主动开启后可保存文本与参数。

- **用途**：加权决策评分。
- **输入**：编辑器中的文本或 JSON；输入格式见下方示例及使用注解。
- **输出**：可复制及下载的文本结果。
- **使用注解与限制**：按权重对选项的 0–10 分进行加权平均并排序；权重非负且总和大于零。成本等负向指标需先自行转换成越高越好。 输入上限 5 MiB，运行在可取消的 Worker；拒绝不支持或无法安全表示的输入。
- **实现**：[everyday.ts](../src/tools/everyday.ts)；注册与参数见 [schema.ts](../src/tools/schema.ts)。

**参数**：

无额外参数。

**示例输入**：

```text
{"weights":{"cost":3,"quality":7},"options":[{"name":"A","scores":{"cost":8,"quality":6}},{"name":"B","scores":{"cost":5,"quality":9}}]}
```

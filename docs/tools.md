# 工具功能手册

核对日期：2026-10-29。当前为 7 类、49 个稳定入口。“已实现”表示已有代码能力，不等于完成全部发布验收；验证覆盖范围见[验证记录](verification.md)。参数来自 [schema.ts](../src/tools/schema.ts)，标题和示例来自[元数据](../src/tools/metadata.json)。

## 阅读说明

- 每节提供用途、输入输出、参数默认值、可选模式、使用注解、限制和源码位置。空字符串默认值用 `""` 表示，fromZone 默认为设备 IANA 时区，不写死编辑机器时区。
- 一般输入上限 5 MiB，特定文件、条数和格式限制在各节说明。转换结果可复制与下载；只读 HTTP 速查除外。
- “禁用持久草稿”不影响当前会话内存编辑；普通草稿也需主动开启保存。文件读取关闭并清除该工具持久草稿，切页后文件需重新选择。
- 示例从页面“载入示例”开始；CSS 和数据生成器用默认参数运行；图片和二维码识别可本地生成示例。示例数据不代表生产业务规则。
- 参数与输入修改使旧结果失效。详细操作与状态见[交互规范](interaction-style.md)。

## 分类索引

- **JSON 与数据（10）**：`json-formatter`、`json-escape`、`json-diff`、`json-path`、`json-yaml`、`json-csv`、`json-typescript`、`json-schema`、`json-reshape`、`i18n-check`。
- **编码与加密（7）**：`base64`、`url-codec`、`unicode-html`、`hash`、`aes`、`hmac`、`jwt`。
- **时间与日期（4）**：`timestamp`、`timezone`、`date-calculator`、`cron`。
- **代码与文本（9）**：`code-formatter`、`code-minifier`、`js-obfuscator`、`text-diff`、`regex`、`text-batch`、`string-case`、`env-diff`、`text-encoding`。
- **CSS 与视觉（10）**：`color`、`gradient`、`shadow`、`radius`、`flex`、`grid`、`css-units`、`animation`、`svg-tools`、`image-tools`。
- **URL 与接口（5）**：`url-parser`、`curl-converter`、`http-reference`、`request-params`、`har-analyzer`。
- **生成器与数值（4）**：`random`、`radix`、`mock-data`、`qr-code`。

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
- **使用注解与限制**：使用 HEX / Base64 原始密钥，支持 128 / 192 / 256 位。每次加密随机 IV；GCM 为 12 字节 IV、128 位 tag，CBC 为 16 字节 IV、PKCS#7。不是密码派生工具；认证失败不输出部分明文。
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
| `width` · 最大宽度（px）      | `"1920"` | 数字，范围见说明与运行校验 |
| `height` · 最大高度（px）     | `"1080"` | 数字，范围见说明与运行校验 |
| `quality` · 图片质量（0.1–1） | `"0.8"`  | 数字，范围见说明与运行校验 |

**示例入口**：点击“载入示例”生成本地 PNG，再运行并下载图片。

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

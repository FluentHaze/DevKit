# 依赖用途、版本与许可证

核对日期：2026-10-29。版本、许可证和仓库地址读取自当前安装包元数据；约束在 package.json，精确解析在 pnpm-lock.yaml。本表是当前快照，不宣称上游最新，也不替代完整传递依赖许可证审计。

## 运行时依赖

| 包                      | 安装版本 | 许可证                  | 用途 / 官方仓库                                                                                        |
| ----------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `@js-temporal/polyfill` | 0.5.1    | ISC                     | IANA 时区、DST 和日历计算 · [来源](https://github.com/js-temporal/temporal-polyfill)                   |
| `cron-parser`           | 5.10.2   | MIT                     | 标准五/六段 Cron 时间枚举 · [来源](https://github.com/harrisiirak/cron-parser)                         |
| `cronstrue`             | 3.38.0   | MIT                     | 中英文 Cron 描述 · [来源](https://github.com/bradymholt/cRonstrue)                                     |
| `css-tree`              | 3.2.1    | MIT                     | CSS 语法解析和压缩 · [来源](https://github.com/csstree/csstree)                                        |
| `culori`                | 4.0.2    | MIT                     | 颜色转换与 WCAG 比率 · [来源](https://github.com/Evercoder/culori)                                     |
| `diff`                  | 9.0.0    | BSD-3-Clause            | 行/字符差异 · [来源](https://github.com/kpdecker/jsdiff)                                               |
| `dompurify`             | 3.4.17   | (MPL-2.0 OR Apache-2.0) | SVG 和 Markdown 清理 · [来源](https://github.com/cure53/DOMPurify)                                     |
| `hash-wasm`             | 4.12.0   | MIT                     | 流式文件及文本哈希 · [来源](https://github.com/Daninet/hash-wasm)                                      |
| `he`                    | 2.0.0    | MIT                     | HTML 实体编解码 · [来源](https://github.com/mathiasbynens/he)                                          |
| `html-minifier-terser`  | 7.2.0    | MIT                     | 保留显示空白的 HTML 压缩 · [来源](https://github.com/terser/html-minifier-terser)                      |
| `javascript-obfuscator` | 5.9.0    | BSD-2-Clause            | JS 混淆、browser-no-eval 输出 · [来源](https://github.com/javascript-obfuscator/javascript-obfuscator) |
| `jsonc-parser`          | 3.3.1    | MIT                     | JSON 语法树、行列与保真校验 · [来源](https://github.com/microsoft/node-jsonc-parser)                   |
| `jsqr`                  | 1.4.0    | Apache-2.0              | Worker 内二维码解码 · [来源](https://github.com/cozmo/jsQR)                                            |
| `lucide-react`          | 1.63.0   | ISC                     | 统一 SVG 图标 · [来源](https://github.com/lucide-icons/lucide)                                         |
| `marked`                | 18.1.2   | MIT                     | Markdown 转 HTML，仍需清理 · [来源](https://github.com/markedjs/marked)                                |
| `papaparse`             | 5.7.0    | MIT                     | CSV 解析与序列化 · [来源](https://github.com/mholt/PapaParse)                                          |
| `prettier`              | 3.9.10   | MIT                     | 代码/Markdown 格式化和项目排版 · [来源](https://github.com/prettier/prettier)                          |
| `qrcode`                | 1.5.4    | MIT                     | 二维码 SVG 和本地示例 · [来源](https://github.com/soldair/node-qrcode)                                 |
| `react`                 | 19.3.1   | MIT                     | 组件和状态 · [来源](https://github.com/react/react)                                                    |
| `react-dom`             | 19.3.1   | MIT                     | DOM 渲染 · [来源](https://github.com/react/react)                                                      |
| `sql-formatter`         | 15.9.0   | MIT                     | SQL 方言格式化 · [来源](https://github.com/sql-formatter-org/sql-formatter)                            |
| `svgo`                  | 4.1.0    | MIT                     | Worker 内 SVG 浏览器优化 · [来源](https://github.com/svg/svgo)                                         |
| `terser`                | 5.51.2   | BSD-2-Clause            | JS 压缩，不执行输入 · [来源](https://github.com/terser/terser)                                         |
| `yaml`                  | 2.9.1    | ISC                     | YAML core schema 解析 · [来源](https://github.com/eemeli/yaml)                                         |

## 开发依赖

| 包                            | 安装版本 | 许可证     | 用途 / 官方仓库                                                                              |
| ----------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------- |
| `@eslint/js`                  | 10.0.1   | MIT        | 静态规则和 Hooks 检查 · [来源](https://github.com/eslint/eslint)                             |
| `@tailwindcss/vite`           | 4.3.3    | MIT        | Tailwind 样式构建 · [来源](https://github.com/tailwindlabs/tailwindcss)                      |
| `@types/css-tree`             | 3.2.0    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/culori`               | 4.0.1    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/he`                   | 1.2.3    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/html-minifier-terser` | 7.0.2    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/node`                 | 26.6.5   | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/papaparse`            | 5.5.2    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/qrcode`               | 1.5.6    | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/react`                | 19.3.0   | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@types/react-dom`            | 19.3.0   | MIT        | 开发类型声明 · [来源](https://github.com/DefinitelyTyped/DefinitelyTyped)                    |
| `@vitejs/plugin-react`        | 6.1.2    | MIT        | React 构建支持 · [来源](https://github.com/vitejs/vite-plugin-react)                         |
| `eslint`                      | 10.13.0  | MIT        | 静态规则和 Hooks 检查 · [来源](https://github.com/eslint/eslint)                             |
| `eslint-plugin-react-hooks`   | 7.1.1    | MIT        | 静态规则和 Hooks 检查 · [来源](https://github.com/facebook/react)                            |
| `eslint-plugin-react-refresh` | 0.5.7    | MIT        | 静态规则和 Hooks 检查 · [来源](https://github.com/ArnaudBarre/eslint-plugin-react-refresh)   |
| `prettier-plugin-tailwindcss` | 0.8.1    | MIT        | 格式及 Tailwind 类排序 · [来源](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| `tailwindcss`                 | 4.3.3    | MIT        | Tailwind 样式构建 · [来源](https://github.com/tailwindlabs/tailwindcss)                      |
| `typescript`                  | 5.9.3    | Apache-2.0 | 类型检查与文档静态语法读取 · [来源](https://github.com/microsoft/TypeScript)                 |
| `typescript-eslint`           | 8.72.1   | MIT        | 静态规则和 Hooks 检查 · [来源](https://github.com/typescript-eslint/typescript-eslint)       |
| `vite`                        | 8.3.5    | MIT        | 开发、构建和预览 · [来源](https://github.com/vitejs/vite)                                    |
| `vitest`                      | 5.0.5    | MIT        | 自动测试 · [来源](https://github.com/vitest-dev/vitest)                                      |

## 加载、隐私与兼容边界

- 工具算法、格式器、混淆器和媒体依赖按功能懒加载，构建成本地静态资源；不使用运行时 CDN。生产资源清单应包含 Worker 与依赖。
- jsQR 当前安装 1.4.0，不据此宣称近期频繁发版。SVG 使用 SVGO 浏览器入口，不能使用 Node 专用入口替代。
- Marked 不负责清理。Markdown 预览还需 DOMPurify 和无脚本 iframe；SVG 清理后才优化与展示。
- 图片依赖本地 Canvas；二维码无需摄像头权限。编码工具使用 TextEncoder / TextDecoder；GBK 编码由严格解码建立可逆映射，不引入 Node Buffer / stream 垫片。
- 混淆器浏览器包含上游 eval("require") getter，构建会警告；应用不调用该 getter、不执行用户源码。模块 Worker 为上游 Chance 的全局赋值预建属性，见 src/tools/text.ts。
- CSP 不开放 JavaScript unsafe-eval；hash-wasm 的 WASM 编译单独使用 wasm-unsafe-eval。来源策略见 vite.config.ts。
- 项目固定 pnpm 8.10.5，要求 Node >=22.13.0，CI 使用 Node 24；依赖升级后重新检查兼容性和许可证。

## 新增或升级依赖

说明用途、现有能力为何不足、浏览器和 Worker 入口、维护与许可证、体积和本地处理边界。安装后同时更新本表、锁文件、功能手册和验证记录。涉及上传、额外权限或隐私变化时先取得授权，见[开发指南](development.md)。

TypeScript → JSON 示例复用已有 prettier/plugins/typescript 解析 AST，按需在 Worker 加载；未新增依赖或执行输入代码。

## 2026-10-29 实用工作台依赖

下面是本机安装及锁文件快照，并非上游最新版本声明；全部打包到本地资源，按工具载入。

| 包                 | 安装版本 | 许可证       | 用途与官方来源                                                                                         |
| ------------------ | -------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `exceljs`          | 4.4.0    | MIT          | XLSX 读取/写入，仅浏览器入口，不保留原样式；[上游](https://github.com/exceljs/exceljs)                 |
| `pdf-lib`          | 1.17.1   | MIT          | PDF 合并、提取与拆分；[上游](https://github.com/Hopding/pdf-lib)                                       |
| `pdfjs-dist`       | 6.4.299  | Apache-2.0   | PDF 页面渲染；worker、字体、CMap、WASM 随站点构建；[上游](https://github.com/mozilla/pdf.js)           |
| `fflate`           | 0.8.3    | MIT          | 批量结果 ZIP 打包；[上游](https://github.com/101arrowz/fflate)                                         |
| `fast-xml-parser`  | 5.11.2   | MIT          | XML 解析/生成；拒绝 DTD/实体；[上游](https://github.com/NaturalIntelligence/fast-xml-parser)           |
| `smol-toml`        | 1.9.1    | BSD-3-Clause | TOML 解析与生成；[上游](github:squirrelchat/smol-toml)                                                 |
| `ini`              | 6.0.0    | ISC          | 简单 INI 节解析/生成；[上游](https://github.com/npm/ini)                                               |
| `highlight.js`     | 11.12.0  | BSD-3-Clause | 代码卡片的本地语法高亮；[上游](git://github.com/highlightjs/highlight.js)                              |
| `@peculiar/x509`   | 3.1.0    | MIT          | X.509 证书解析；不做信任链验证；[上游](https://github.com/PeculiarVentures/x509)                       |
| `reflect-metadata` | 0.2.2    | Apache-2.0   | X.509 上游依赖要求的反射元数据，先于证书库初始化；[上游](https://github.com/rbuckton/reflect-metadata) |
| `@types/ini`       | 4.1.1    | MIT          | INI 开发类型声明；[上游](https://github.com/DefinitelyTyped/DefinitelyTyped)                           |

PDF.js 6 的构建环境要求使项目最低 Node 版本调整为 22.13，CI 与 .nvmrc 继续使用 Node 24。ExcelJS 上游存在弃用的传递依赖，未擅自替换其内部版本。完整离线缓存会比原版本更大；资源按工具加载，首页不直接载入 PDF/Excel 解析器。

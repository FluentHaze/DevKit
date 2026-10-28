# 依赖用途与许可证

核查日期：2026-10-28。版本来自实际安装结果及 pnpm-lock.yaml；许可证与项目地址来自官方 npm 包元数据。选型核实了 React、Vite、Tailwind、Prettier、YAML、Cron、混淆器等官方文档；不使用运行时 CDN。

| 包                    | 版本   | 许可证       | 用途 / 官方项目                                                                                                 |
| --------------------- | ------ | ------------ | --------------------------------------------------------------------------------------------------------------- |
| @js-temporal/polyfill | 0.5.1  | ISC          | IANA 时区、DST 歧义拒绝与日历运算 · [官方项目](https://github.com/js-temporal/temporal-polyfill)                |
| cron-parser           | 5.10.2 | MIT          | 五/六段标准 Cron 未来时间 · [官方项目](https://github.com/harrisiirak/cron-parser)                              |
| css-tree              | 3.2.1  | MIT          | CSS 解析/序列化压缩 · [官方项目](csstree/csstree)                                                               |
| culori                | 4.0.2  | MIT          | 颜色转换和 WCAG 比率 · [官方项目](git@github.com:Evercoder/culori)                                              |
| diff                  | 9.0.0  | BSD-3-Clause | 行/字符 diff · [官方项目](https://github.com/kpdecker/jsdiff)                                                   |
| hash-wasm             | 4.12.0 | MIT          | 流式 MD5/SHA 文件与文本摘要 · [官方项目](https://github.com/Daninet/hash-wasm)                                  |
| he                    | 2.0.0  | MIT          | HTML 命名与数字实体 · [官方项目](https://github.com/mathiasbynens/he)                                           |
| html-minifier-terser  | 7.2.0  | MIT          | 保留显示空白的 HTML 压缩 · [官方项目](https://github.com/terser/html-minifier-terser)                           |
| javascript-obfuscator | 5.9.0  | BSD-2-Clause | 本地 JS 混淆，browser-no-eval 输出 · [官方项目](https://github.com/javascript-obfuscator/javascript-obfuscator) |
| jsonc-parser          | 3.3.1  | MIT          | JSON 语法树、错误位置和重复键检测 · [官方项目](https://github.com/microsoft/node-jsonc-parser)                  |
| lucide-react          | 1.63.0 | ISC          | 统一 SVG 图标 · [官方项目](https://github.com/lucide-icons/lucide)                                              |
| papaparse             | 5.7.0  | MIT          | CSV 解析与序列化 · [官方项目](https://github.com/mholt/PapaParse)                                               |
| prettier              | 3.9.10 | MIT          | 本地 JS/TS/HTML/CSS 格式化 · [官方项目](prettier/prettier)                                                      |
| react                 | 19.3.1 | MIT          | 组件和状态 · [官方项目](https://github.com/react/react)                                                         |
| react-dom             | 19.3.1 | MIT          | 浏览器渲染 · [官方项目](https://github.com/react/react)                                                         |
| sql-formatter         | 15.9.0 | MIT          | SQL 格式化与方言 · [官方项目](https://github.com/sql-formatter-org/sql-formatter)                               |
| terser                | 5.51.2 | BSD-2-Clause | JS 语义压缩，不执行源码 · [官方项目](https://github.com/terser/terser)                                          |
| yaml                  | 2.9.1  | ISC          | YAML 1.2 core schema、别名限制 · [官方项目](github:eemeli/yaml)                                                 |

开发依赖：TypeScript 5.9（与 typescript-eslint 的受支持范围匹配）、Vite 8、Tailwind 4 的官方 Vite 插件、ESLint、Vitest、Prettier Tailwind 插件及类型声明；具体版本由锁文件固定。Node 要求来自当前 Vite 官方兼容范围。

混淆器的浏览器 bundle 含上游 `eval("require")` getter，构建器会给出警告；应用不调用该 getter，也不使用 eval 执行输入。生产页面 CSP 不允许 `unsafe-eval`，选择 `browser-no-eval` 输出；在模块 Worker 中为上游 Chance 的全局赋值预建属性，已通过实际生产浏览器运行验证。该兼容处理位于 `src/tools/text.ts`。

大型格式器/混淆器只在使用对应工具时加载，不计入首页初始 JS；hash-wasm 的 WASM 编译使用 `wasm-unsafe-eval`，不开放 JavaScript eval。

Cron 自然语言说明按需使用 cronstrue 3.38.0（MIT，[官方项目](https://github.com/bradymholt/cRonstrue)）；已核实其 i18n API，仅允许本产品的五/六段标准语法，并显式使用日/周 OR 语义。

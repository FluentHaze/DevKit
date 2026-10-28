# 第一版实现与验收记录

日期：2026-10-28（Asia/Shanghai）。当前为第一版可运行实现；完整发布验收仍未完成，不等同于 requirements.md 的全部完成条件已满足。

## 已执行检查

- `pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm test`、`pnpm build`。
- 75 项测试：全部 38 个转换/生成工具示例、JSON 保真边界、CSV、Unicode、Base64、加密向量、DST、BigInt、种子数据、CSS 安全和 cURL 拒绝不支持语法。HTTP 为独立离线速查页。
- 首页初始 JS 合计 gzip 约 97 KB，CSS gzip 约 6.4 KB。格式器、混淆器与工具算法按需加载。离线清单包含 36 个静态文件及根页面地址。

## 实际浏览器检查

使用 Codex 内嵌浏览器完成，不代表全部目标浏览器均已验证：

- JSON 示例 → Worker → 正确格式化结果、真实字节与行数。
- 中英文切换保留输入及结果；英文界面用中文关键词搜索，⌘K/Enter 导航可用。
- 1280px/1440px 桌面、1024×768 平板、390×844 手机检查。主内容左边距分别为 240/64/0px；document scrollWidth 等于 clientWidth，未发现页面横向溢出。
- 浅色与深色工作台；并非所有工具/语言/视口的完整视觉矩阵。
- 生产包 JavaScript 混淆成功；修复上游 Chance 在模块 Worker 中的全局赋值兼容问题。HTML 压缩保留显示空白，移除注释。
- `(a+)+$` 对长 a 串加 `!` 的灾难性回溯在 1 秒超时后终止，显示本地化错误，页面仍可交互。
- 设置下载全部离线资源后停止对应本地服务器：首次进入 Base64 路由仍可加载页面、Worker、依赖并完成 Unicode 编码；清空后刷新独立路由仍能打开。输入 `Hello, 世界 👋`，结果 `SGVsbG8sIOS4lueVjCDwn5GL`。
- 修复 `Vary: Origin` 导致的离线模块缓存不命中；版本化静态资源缓存忽略 Vary，不缓存用户输入。

## 性能样例

macOS arm64 / Node 24.22.1，程序生成测试数据，纯算法测量。未包含文件读取、浏览器渲染、Worker 启动及消息传输，不是设备无关的性能承诺。

| 项目                        |     耗时 |
| --------------------------- | -------: |
| 1 MiB 文本批处理            |  55.0 ms |
| 5 MiB 文本批处理            | 158.6 ms |
| 100 MiB SHA-256，1 MiB 分块 | 357.6 ms |

复测：`DEVKIT_BENCHMARK_REPORT=/tmp/devkit-perf.json pnpm test src/tools/performance.test.ts`。报告仅含环境与耗时，不含用户内容。

## 边界和待完成项

- JSONPath 明确使用安全子集：字段、索引、通配、递归字段、正向数组切片；不执行过滤脚本，不宣称完整 RFC 9535 支持。
- JSON 重复键/不安全数字阻止转换；YAML 不保留注释，不支持复杂 Map 键和自定义标签。
- cURL 只支持常见 POSIX method/header/data；文件上传、不支持的 flag、重复 header、shell 展开明确拒绝，生成代码不执行。
- JSON 对比使用字段路径差异报告，对象键顺序始终忽略；支持输入联动滚动开关。JSONPath 可单独复制前 100 条匹配路径，全部路径可从完整结果复制。JSON 解析错误可跳转行列。
- Cron 有分字段配置、中英文自然语言说明和未来 10 次时间；始终按标准 Cron 的日/周 OR 语义描述，不支持 Quartz。
- CSS 有色标/层/关键帧增删、动画预设、数值/滑块、Grid 3×3 选区和配套 HTML/CSS 导出；高级配置保留 JSON/标准 CSS 参数输入。预览 iframe 允许父页面控制暂停状态，但禁止 iframe 脚本和网络访问。
- 收藏支持拖拽和键盘按钮排序。普通工具持久草稿上限 256 KiB；读取本地文件会关闭并清除该工具持久草稿。
- Chrome/Edge/Firefox/Safari 当前及上一主版本完整矩阵未执行；内嵌浏览器未提供可可靠记录的引擎精确版本。
- 完整网络面板审计、全部工具双语交互矩阵、剪贴板失败/文件/取消链路、200% 缩放、辅助技术和 WCAG 2.2 AA 正式审核仍待执行。
- 离线更新的多标签页、配额不足及缓存损坏矩阵仍待执行。

混淆器的上游构建警告与 CSP 说明见 [依赖说明](dependencies.md)。应用源码不使用 eval/new Function 执行输入。

## 截图

- [工作台](verification/workspace.jpg)
- [桌面 JSON](verification/desktop-json.jpg)
- [平板 JSON](verification/tablet-json.jpg)
- [手机 JSON](verification/mobile-json.jpg)
- [服务器停止后的 Base64 结果](verification/offline-base64.jpg)

# DevKit

本地优先的开发者网页工具箱。React + TypeScript + Vite + Tailwind CSS，使用 **pnpm** 管理依赖。

## 启动

需要 Node.js **22.12+**，推荐 `.nvmrc` 指定的 Node 24。仓库中不使用 npm/yarn 锁文件。

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

打开终端打印的本地地址（默认 `http://127.0.0.1:5173`）。生产预览：

```sh
pnpm build
pnpm preview
```

生产构建会为 39 个工具生成静态目录入口，直接访问或刷新工具地址均可使用，无需服务器 SPA rewrite。Web Crypto、剪贴板与 Service Worker 需要 HTTPS 或 localhost。

## GitHub Pages

推送 `main` 后，`.github/workflows/pages.yml` 使用 pnpm 检查、构建并部署到 `https://fluenthaze.github.io/DevKit/`。Pages 的发布源为 GitHub Actions。构建使用 `VITE_BASE_PATH=/DevKit/`，导航、图标、Worker 与离线缓存均按此子路径工作。

本地复现 Pages 构建：

```sh
VITE_BASE_PATH=/DevKit/ pnpm build
VITE_BASE_PATH=/DevKit/ pnpm preview
```

预览时访问终端地址下的 `/DevKit/`。不设置该变量时仍以根路径运行，适合普通静态托管。

## 已实现

- 7 类、39 个独立工具路由，38 个转换/生成工具及 HTTP 离线速查；工具不是占位页面。
- 中英文、浅深色/跟随系统、响应式导航、⌘/Ctrl+K 搜索、收藏排序、最近使用。
- 输入输出、参数、示例、空态、错误、重置与撤销、复制、下载、实际字节/行数/耗时。
- Worker 隔离、任务取消与过期结果保护；正则 1 秒超时，其他处理任务 60 秒上限。
- CSS 隔离预览与可视配置；主题 tokens；所有依赖本地打包，无远程字体、遥测或后端。
- 可选普通工具草稿；AES/HMAC/JWT/cURL 禁止持久化；本地文件读取会关闭并清除该工具的持久草稿。
- 生产构建生成 Service Worker 和离线资源清单；设置内可下载全量工具资源、清理缓存；更新由用户选择刷新。

当前为第一版可运行实现。**完整发布验收仍需补齐**：各目标浏览器的当前及上一主要版本、200% 缩放/辅助技术、全部工具的双语交互矩阵与完整网络面板审计。已执行的测试、限制与截图见 [验收记录](docs/verification.md)，不能把自动测试通过视为所有需求均已验收。

## 检查

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

GitHub Actions 运行同一套检查。`pnpm format` 自动执行 Prettier 与 Tailwind 类名排序。

## 数据与使用边界

输入只在浏览器内存中处理，站内切换保留会话，刷新默认丢弃。只有用户主动开启的普通工具草稿会保存到此设备，最大 256 KiB。收藏只存工具 ID；最近使用只存工具 ID 和时间。文件不上传，文件名不写入日志或持久存储。生成的代码只作为文本显示，不会运行或自动发请求。

JSON 重复键、超出安全范围的数字会阻止转换，而不是静默丢失；JSONPath 为界面明确标注的安全子集。JWT 仅解析未验签；AES 使用原始密钥与随机 IV；MD5/SHA-1 仅用于兼容性检查。更多约束见需求文档。

## 文档

- [产品需求与验收](docs/requirements.md)
- [设计规范](docs/design-style.md)
- [交互规范](docs/interaction-style.md)
- [代码架构](docs/code-style.md) / [格式规范](docs/code-format.md)
- [依赖用途与许可证](docs/dependencies.md)
- [开发约定](AGENTS.md)

约束优先级：用户最新明确要求 > 产品需求与验收 > 交互规范 > 设计规范 > 代码风格与格式规范。

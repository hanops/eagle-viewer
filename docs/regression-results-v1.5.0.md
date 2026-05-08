# Regression Results v1.5.0

日期：`2026-05-08`

## 环境

- 本地开发环境：`uv sync` + 项目内 `.venv`
- 真实 Eagle 库：本机用户文档目录下的一个 `.library` 库
- 浏览器验证：Codex in-app browser，`http://127.0.0.1:8000`

## 自动检查

- `uv run python -m compileall app`：通过
- `uv run python -c "import app.main, app.api.folders, app.api.items, app.vault.parser"`：通过
- `node --check app/web/core.js app/web/render.js app/web/api.js app/web/interactions.js app/web/bootstrap.js app/web/sw.js`：通过
- `git diff --check`：通过

## 真实库索引

- 素材：`2015`
- 文件夹：`7`
- 标签：`6`
- 扫描耗时：约 `694ms`
- 跳过项：`0`

## API 抽查

- `GET /api/items?limit=5`：返回总数 `2015`，首批 `5` 项，`hasMore=true`
- `GET /api/recent?days=30&limit=5`：返回总数 `24`
- `GET /api/search?q=png&limit=5`：返回总数 `1981`
- `GET /api/duplicates?limit=5`：返回 `2` 组疑似重复，前两组数量为 `3`、`2`
- 高级筛选示例：`min_width=1000` + `shape=landscape` + `tag_state=tagged` 返回总数 `1110`

## 浏览器抽查

- 首页加载：通过，显示 `全部文件 · 2015 项`
- 左侧文件夹和标签：通过
- 高级筛选面板：可打开
- 保存视图面板：可打开
- 索引状态面板：可打开并显示真实库统计
- 命令面板：可打开
- 疑似重复视图：可打开

## 移动端抽查

- 视口：`390 x 844`
- 首页加载：通过，显示 `全部文件 · 2015 项`
- 移动端菜单按钮与侧栏抽屉：通过
- 高级筛选面板：通过
- 命令面板：通过
- 疑似重复视图：通过
- 底部 Inspector：通过
- 移动端工具区：调整为横向滚动，并将命令面板、高级筛选、索引状态、疑似重复入口优先显示

## 剩余风险

- 未逐个验证所有预览格式和批量下载
- 保存视图、收藏、待整理清单使用浏览器 `localStorage`，不跨浏览器或设备同步

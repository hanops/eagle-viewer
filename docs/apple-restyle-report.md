# Eagle Vault Viewer — Apple 风格还原修复报告

> 版本：v4.2.0 ｜ 日期：2026-08-07 ｜ 状态：已验证通过

---

## 一、概述

本次工作将 Eagle Vault Viewer 的桌面端与移动端 PWA 全面还原为 Apple 设计风格（Apple HIG），同时修复了移动端底部导航栏首次打开时位置靠上的问题。工作分为画布预览确认与真实代码库落地两个阶段。

### 变更范围

| 表面 | 涉及文件 | 改动类型 |
|------|---------|---------|
| 主题体系精简 | 7 个文件 | 逻辑 + token |
| 移动端导航栏修复 | `mobile.css` / `mobile.js` | Bug fix |
| 桌面端各表面苹果化 | 6 个 `styles-*.css` | token + 阴影 + 圆角 |
| 响应式移动壳 + PWA | `mobile.css` / `mobile.html` / `manifest.json` | token + meta |
| 测试用例同步 | `tests/test_pwa_restore_contract.py` | 断言更新 |
| 暖色残留清理 | `styles-polish.css` / `styles-mobile-shell.css` / `styles-detail.css` / `mobile.css` | 色值替换 |

---

## 二、主题体系精简

### 改动前

- 三套主题：Gallery（浅暖）、Workbench（深暖）、Carbon（深冷灰）
- 两种强调色：Terra（陶土橙）、Green（墨绿）
- 字体：衬线 display 字体 + 暖灰中性色

### 改动后

- **两套主题**：浅色（Light）/ 深色（Dark）
- **单一强调色**：Apple 系统蓝
  - 浅色：`#007aff`
  - 深色：`#0a84ff`（Apple 深色模式系统蓝）
- **字体**：SF Pro 系统字体栈
  ```
  -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
  "PingFang SC", "Microsoft YaHei", system-ui, sans-serif
  ```
- 旧主题键自动迁移：`gallery → light/blue`、`workbench → dark/blue`、`carbon → dark/blue`

### 涉及文件

- `app/web/index.html` — 主题切换器 UI 从三按钮改为双按钮（浅色/深色）
- `app/web/mobile.html` — 首帧前内联主题脚本，迁移旧键
- `app/web/interactions-filters.js` — 主题逻辑精简
- `app/web/mobile.js` — 移动端主题逻辑同步
- `app/web/styles.css` — 核心 token 定义
- `app/web/styles-polish.css` — 最终层 token 覆盖（详见第四节）
- `app/web/manifest.json` — `theme_color` / `background_color` 对齐

---

## 三、移动端导航栏首屏位置修复

### 问题描述

iOS Safari 首屏渲染时，`100dvh`（动态视口高度）取值存在时序问题：在页面首次绘制的那一刻，`dvh` 可能使用了不含浏览器 chrome 的全屏高度，导致 `#app` 容器过高，底部导航栏（`.tabs`）被推到可视区域下方或位置偏上。视觉表现为导航栏第一次打开时"飘"在屏幕中部偏上，滚动或旋转后才回到正确位置。

### 根因

```css
/* 修复前 */
#app {
  height: 100dvh;  /* iOS Safari 首帧取值不可靠 */
}
```

`100dvh` 虽然会在浏览器 chrome 显示/隐藏时动态更新，但在首帧渲染时其初始值可能不准确，且无法覆盖 `visualViewport` 的所有变化场景。

### 解决方案

用 `visualViewport` API 驱动一个 CSS 自定义变量 `--app-h`，在首帧前和每次视口变化时同步真实可视高度。

**`app/web/mobile.js` 新增 `syncAppHeight` 函数：**

```javascript
function syncAppHeight() {
  var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', h + 'px');
}
syncAppHeight();
window.visualViewport && window.visualViewport.addEventListener('resize', syncAppHeight);
window.addEventListener('resize', syncAppHeight);
```

**`app/web/mobile.css` 调整 `#app` 高度声明：**

```css
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;                              /* 极旧浏览器兜底 */
  height: 100dvh;                             /* 动态视口：chrome 显示/隐藏时更新 */
  height: var(--app-h, 100dvh);               /* visualViewport 驱动；修复 iOS 首帧 tabbar 漂移 */
}
```

三层 `height` 声明形成渐进增强：`var(--app-h)` 优先（JS 驱动），未注入时回退到 `100dvh`，再回退到 `100vh`。

### 验证结果

浏览器实测 `--app-h` 计算值为 `788px`（匹配真实可视高度），导航栏固定在底部正确位置。

---

## 四、关键修复：styles-polish.css token 覆盖问题

### 发现过程

在浏览器中验证时，`styles.css` 的 Apple token 定义已正确，但计算值仍是旧暖色（`--bg: #f4f0e8`、`--text: #28221c`）。

### 根因

`index.html` 中 CSS 加载顺序为：

```
styles.css → styles-collection.css → styles-detail.css → styles-desktop.css
→ styles-mobile-shell.css → styles-mobile-search.css → styles-mobile-preview.css
→ styles-mobile-actions.css → styles-formats.css → styles-polish.css
```

`styles-polish.css` 最后加载，其中第 519-546 行的 `[data-theme="light"]` / `[data-theme="dark"]` 块重新定义了所有核心 token，将 Apple 中性色覆盖回旧暖色值。

### 修复

将 `styles-polish.css` 中的 token 覆盖块对齐为 Apple HIG 色值：

| Token | 旧值（暖色） | 新值（Apple） |
|-------|------------|-------------|
| `--bg` (light) | `#f4f0e8` | `#f5f5f7` |
| `--bg2` (light) | `#fffdf9` | `#ffffff` |
| `--bg3` (light) | `#e9e4db` | `#f2f2f7` |
| `--border` (light) | `rgba(55,42,30,.14)` | `rgba(0,0,0,.08)` |
| `--text` (light) | `#28221c` | `#1d1d1f` |
| `--text-muted` (light) | `#71685f` | `#6e6e73` |
| `--bg` (dark) | `#171613` | `#000000` |
| `--bg2` (dark) | `#211f1b` | `#1c1c1e` |
| `--bg3` (dark) | `#2d2a24` | `#2c2c2e` |
| `--text` (dark) | `#f5efe7` | `#f5f5f7` |
| `--text-muted` (dark) | `#b2a99f` | `#8e8e93` |

---

## 五、暖色 rgba 阴影/边框残留清理

在 token 覆盖修复后，全量扫描发现样式文件中仍有 13 处硬编码的暖色 rgba 阴影/边框值（形如 `rgba(42,31,19,...)`）。这些值不影响 token 变量，但会在浅色模式下呈现暖调阴影，与 Apple 中性风格不一致。

### 清理范围

| 文件 | 清理数量 | 示例 |
|------|---------|------|
| `styles-polish.css` | 8 处 | `rgba(42,31,19,.65)` → `rgba(0,0,0,.65)` |
| `styles-mobile-shell.css` | 1 处 | `rgba(35,30,22,.88)` → `rgba(0,0,0,.88)` |
| `styles-detail.css` | 1 处 | 琥珀色 badge → Apple 警告色 `#ff9500` |
| `mobile.css` | 3 处 | `rgba(38,29,20,.08)` → `rgba(0,0,0,.08)` |

### detail.css 特殊处理

`styles-detail.css` 第 455-458 行的 `.preview-quality-notice`（预览质量提示 badge）原使用琥珀色（`#f8d58a` 文字 + `rgba(50,38,18,.72)` 背景）。改为 Apple 标准警告色体系：

```css
/* 修复前 */
border: 1px solid rgba(251,191,36,.22);
background: rgba(50,38,18,.72);
color: #f8d58a;

/* 修复后 */
border: 1px solid rgba(255,149,0,.22);
background: rgba(0,0,0,.72);
color: #ff9500;
```

---

## 六、桌面端各表面苹果化

### 工具栏（Toolbar）

- 高度 58px，毛玻璃背景 `color-mix(in srgb, var(--bg2) 94%, transparent)` + `backdrop-filter: blur(18px) saturate(1.08)`
- 发丝边底部分割线 `border-bottom: 1px solid var(--border)`
- 品牌名使用 display 字体，`b` 标签着系统蓝

### 搜索框

- 高度 40px，圆角 12px
- 背景 `color-mix(in srgb, var(--bg3) 72%, var(--bg2))`
- focus 时边框变为系统蓝

### 侧栏（Sidebar）

- 背景 `--sidebar-bg`（浅色 `#f0f0f2` / 深色 `#161617`）
- 区块标题 11px、650 字重、`0.055em` 字间距
- 列表项 38px 高度、10px 圆角、active 态 9% 文字色叠层

### 内容工具栏

- 60px 高度，毛玻璃背景
- select 控件 34px 高度、9px 圆角、无原生外观、自定义下拉箭头
- 快速筛选器分段控件风格（`--bg3` 容器 + 白色 active 项）

### 卡片阴影

- 浅色：`0 1px 2px rgba(0,0,0,.04), 0 10px 28px rgba(0,0,0,.05)`
- 深色：`0 1px 2px rgba(0,0,0,.48), 0 12px 34px rgba(0,0,0,.2)`
- hover：`0 22px 54px rgba(0,0,0,.12)`（浅）/ `0 22px 54px rgba(0,0,0,.4)`（深）

---

## 七、移动端 PWA 苹果化

### manifest.json

```json
{
  "background_color": "#f5f5f7",
  "theme_color": "#007aff"
}
```

### mobile.html

- `meta theme-color` 改为 `#f5f5f7`
- 首帧前内联脚本处理主题 + 旧键迁移
- `apple-mobile-web-app-status-bar-style` 保持 `black-translucent`

### mobile.css token 体系

与桌面端 `styles.css` 对齐，共享 `--bg` / `--bg2` / `--bg3` / `--border` / `--text` / `--text-muted` / `--accent` / `--font-ui` / `--font-display` 命名。

### 底部导航栏（.tabs）

- 容器 66px 最小高度，毛玻璃 `blur(18px) saturate(1.08)`
- safe-area-inset-bottom 在容器层留白一次，按钮层不重复
- active tab 顶部 3px 蓝色指示条 + 系统蓝文字

### 瀑布流卡片（.th）

- 16px 圆角、发丝边框
- 浅色阴影 `0 1px 2px rgba(0,0,0,.04), 0 12px 30px rgba(0,0,0,.05)`
- 深色阴影 `0 1px 2px rgba(0,0,0,.45), 0 14px 34px rgba(0,0,0,.2)`
- 点击缩放 `scale(.985)` 反馈

---

## 八、测试用例同步

### 修改文件

`tests/test_pwa_restore_contract.py` — `test_theme_and_mobile_navigation_remain_available`

### 改动内容

旧断言检查三主题切换器（gallery/workbench/carbon），与主题精简冲突：

```python
# 修复前
for name in ("gallery", "workbench", "carbon"):
    assert f'data-theme-name="{name}"' in index
```

更新为新主题切换器（light/dark）：

```python
# 修复后
for name in ("light", "dark"):
    assert f'data-theme-name="{name}"' in index
```

`setAttribute('data-theme'` / `setAttribute('data-accent'` 断言保持不变（interactions-filters.js 中逻辑未变）。

---

## 九、验证结果

### make check 全项通过

```
Version check ok: 4.2.0
All checks passed! (ruff)
39 passed, 318 warnings (pytest)
Deploy check ok: FROM digest-pinned, HEALTHCHECK present
8 pass / 0 fail (JS behavior tests)
```

### 浏览器实测计算值

**桌面端（浅色）：**

| 属性 | 计算值 | 符合 Apple HIG |
|------|--------|---------------|
| `--bg` | `#f5f5f7` | ✓ |
| `--bg2` | `#ffffff` | ✓ |
| `--bg3` | `#f2f2f7` | ✓ |
| `--text` | `#1d1d1f` | ✓ |
| `--text-muted` | `#6e6e73` | ✓ |
| `--border` | `rgba(0,0,0,.08)` | ✓ |
| `--accent` | `#007aff` | ✓ |
| `font-family` | `-apple-system, ...` | ✓ |
| toolbar 背景 | `rgba(255,255,255,.9)` | ✓ |
| toolbar 毛玻璃 | `blur(22px) saturate(1.08)` | ✓ |

**桌面端（深色）：**

| 属性 | 计算值 | 符合 Apple HIG |
|------|--------|---------------|
| `--bg` | `#000000` | ✓ |
| `--bg2` | `#1c1c1e` | ✓ |
| `--text` | `#f5f5f7` | ✓ |
| `--accent` | `#0a84ff` | ✓ |

**移动端 PWA：**

| 属性 | 计算值 | 说明 |
|------|--------|------|
| `--app-h` | `788px` | visualViewport 驱动，导航栏修复生效 |
| `--accent` | `#007aff` | ✓ |
| tabs 毛玻璃 | `blur(18px) saturate(1.08)` | ✓ |

---

## 十、改动文件清单

```
app/web/index.html                    主题切换器 UI + theme-color + favicon
app/web/mobile.html                   首帧主题脚本 + 旧键迁移
app/web/mobile.css                    token + 导航栏修复 + 暖色清理
app/web/mobile.js                     syncAppHeight + 主题逻辑
app/web/manifest.json                 theme_color / background_color
app/web/styles.css                    核心 token 定义
app/web/styles-polish.css             token 覆盖修复 + 暖色清理（关键）
app/web/styles-desktop.css            桌面端表面苹果化
app/web/styles-detail.css             badge 色改 Apple 警告色
app/web/styles-collection.css         收藏表面苹果化
app/web/styles-mobile-shell.css       移动壳暖色清理
app/web/styles-mobile-search.css      移动搜索表面
app/web/styles-mobile-preview.css     移动预览表面
app/web/styles-mobile-actions.css     移动操作表面
app/web/styles-formats.css            格式表面
app/web/interactions-filters.js       主题逻辑精简
tests/test_pwa_restore_contract.py    测试断言同步
```

---

## 十一、后续建议

1. **Vault 数据验证**：本次验证使用空 Vault，建议挂载真实 Eagle 库后走一遍 `docs/regression-checklist.md` 中的手动回归路径
2. **Service Worker 缓存**：CSS 版本号 `?v=1.113` 未变但内容已改，用户端需注销旧 SW 或等待自然更新；发布时建议 bump 版本号
3. **真机 iOS 测试**：导航栏修复在桌面浏览器模拟器中验证通过，建议在真实 iPhone 上确认首屏渲染行为

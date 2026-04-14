# Regression Results v1.4.0

日期：`2026-04-13`

## 环境

- Python 虚拟环境：`~/Envs/eagle-viewer`
- 本地 Eagle 库：`~/Documents/资料.library`
- 回归方式：本地启动 FastAPI 服务后，对真实数据执行 API 级回归

## 覆盖范围

已验证以下主路径可正常工作：

- `GET /api/tree`
- `GET /api/items`
- `GET /api/recent?days=30`
- `GET /api/folders/{folder_id}/items`
- `GET /api/tags`
- `GET /api/tags/{tag}/items`
- `GET /api/search`
- `GET /api/items/{item_id}`
- `GET /api/items/{item_id}/thumbnail`
- `GET /api/items/{item_id}/file`
- `POST /api/items/batch-download`
- `POST /api/library/reload`

## 实际结果摘要

- 文件夹树返回正常，当前测试库顶层目录数为 `3`
- 全库列表返回正常，当前总文件数为 `1991`
- 最近 30 天列表返回正常，当前结果数为 `42`
- 标签列表与标签过滤正常，示例标签 `Screenshot`
- 搜索结果正常，示例关键词 `Snipaste`
- `pdf` 文件详情、缩略图链路与原文件链路验证通过
- 批量下载成功返回 ZIP
- 手动刷新索引接口返回 `200`

## 已知限制

- 当前测试库中未找到 `txt` 样本，因此 `txt` 预览链路本次未做真实数据验证
- 本次为 API 级回归，不包含浏览器端完整交互录屏或视觉校验

# 医学知识源格式

本目录只保存经过审核、允许进入本地索引的 Markdown 或 TXT 文档。项目不附带
任何模拟医学知识；实际资料应先完成版权、版本和临床审核。

每份文件必须以 TOML front matter 开头：

```text
+++
source_id = "stable-source-id"
title = "文档标题"
organization = "发布机构"
version = "版本"
published_at = "发布日期"
source_url = "https://example.invalid/source"
scope = "适用范围"
+++

# 章节标题
正文
```

`version` 和 `published_at` 至少填写一个；`source_url` 可以留空。索引文件应放在
被 Git 忽略的 `backend/knowledge_index/`，构建完成后重启后端加载新快照。

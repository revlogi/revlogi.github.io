# AGENTS.md

## 架构

```
content/post/*.md  →  scan  →  parse (yaml + markdown-it + Shiki dual-theme)  →  render (反引号拼接)  →  emit  →  dist/*.html
```

每一阶段是纯数据变换：输入上一阶段输出 → 输出给下一阶段。`build.ts` 里 4 个 `// ---- N. SCAN / PARSE / RENDER / EMIT ----` 注释分隔。

## 命令（Bun）

- `bun run build` — 构建 `dist/`
- `bun run dev` — 构建 + 监听 + 热重载 dev 服务器 at localhost:3000
- `NODE_ENV=production bun run build` — 生产构建（过滤 draft）

## 代码文件（11 个，src/ssg/）

| 文件                | 作用                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `build.ts`          | 4 阶段调度 + I/O 辅助函数                                            |
| `scan.ts`           | 扫 content/post/\*_/_.md，分割 frontmatter                           |
| `parse.ts`          | yaml frontmatter + markdown-it(footnote/anchor/texmath) + Shiki 高亮 |
| `types.ts`          | Post {slug, title, description, publishDate, draft, html} + PageMeta |
| `config.ts`         | siteConfig（5 字段）                                                 |
| `date.ts`           | formatDate + sortPosts                                               |
| `render/layout.ts`  | renderLayout(meta, body) — HTML 外壳                                 |
| `render/post.ts`    | renderPost(post) + renderIndex(posts)                                |
| `styles/global.css` | 极简原生样式（~40 行）                                               |
| `serve.ts`          | dev 热重载服务器（SSE）                                              |
| `types/shims.d.ts`  | markdown-it-texmath 类型声明                                         |

## 方针

- 所有 `render*` 函数是纯 `(data) => string`。无组件树，无 JSX，无模板引擎
- HTML 字符串全部用反引号拼接
- 要加功能：改 types.ts + parse.ts（解析）+ render/\*.ts（展示）+ styles/global.css（样式）
- 不需要我，自己加就是学习

# AGENTS.md

## 架构

```
content/post/*.md  →  scan  →  parse (yaml + markdown-it + Shiki dual-theme)  →  render (HTML 模板替换)  →  emit  →  dist/*.html
```

每一阶段是纯数据变换：输入上一阶段输出 → 输出给下一阶段。`build.ts` 里 4 个 `// ---- N. SCAN / PARSE / RENDER / EMIT ----` 注释分隔。

## 命令（Bun）

- `bun run build` — 构建 `dist/`
- `bun run dev` — 构建 + 监听 + 热重载 dev 服务器 at localhost:3000
- `NODE_ENV=production bun run build` — 生产构建（过滤 draft）

## 代码文件（src/ssg/）

| 文件                | 作用                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `build.ts`          | 4 阶段调度 + I/O 辅助函数                                            |
| `scan.ts`           | 扫 content/post/\*_/_.md，分割 frontmatter                           |
| `parse.ts`          | yaml frontmatter + markdown-it(footnote/anchor/texmath) + Shiki 高亮 |
| `types.ts`          | Post {slug, title, description, publishDate, draft, html} + PageMeta |
| `config.ts`         | siteConfig（5 字段）                                                 |
| `date.ts`           | formatDate + sortPosts                                               |
| `render/template.ts` | 读取 HTML 模板并替换占位符 |
| `templates/*.html` | 页面结构和可复用 HTML 片段 |
| `render/layout.ts`  | renderLayout(meta, body) — HTML 外壳                                 |
| `render/post.ts`    | renderPost(post) + renderIndex(posts)                                |
| `styles/global.css` | 全局样式                                               |
| `serve.ts`          | dev 热重载服务器（SSE）                                              |
| `types/shims.d.ts`  | markdown-it-texmath 类型声明                                         |

## 方针

- `render/*.ts` 负责数据组织、条件判断和列表遍历，返回 HTML 字符串。无组件树，无 JSX，无第三方模板引擎
- HTML 标记放在 `templates/*.html`，通过 `render/template.ts` 的 `renderTemplate(name, values)` 替换 `{{key}}` 占位符
- 占位符原样插入，支持已渲染 HTML；只替换一轮，正文中的 `{{...}}` 不会被再次解析。缺少变量时构建报错
- 模板每次渲染从磁盘读取，开发服务器会监听模板修改并自动重建
- 要加功能：改 types.ts + parse.ts（解析）+ render/*.ts（数据）+ templates/*.html（结构）+ styles/global.css（样式）
- 不需要我，自己加就是学习

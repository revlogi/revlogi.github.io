A simple blog. Draws inspiration from [matklad](https://github.com/matklad/matklad.github.io)


## 页面与样式

- `src/ssg/templates/*.html`：页面结构和复用片段。
- `src/ssg/render/*.ts`：准备模板数据，处理列表和条件显示。
- `src/ssg/styles/global.css`：页面样式。

模板中的 `{{key}}` 由 `renderTemplate(name, values)` 替换，例如 `{{title}}`。
值原样插入，可包含已渲染的文章 HTML；缺少变量时构建会报错。
只修改布局或静态文字时，直接编辑 HTML 模板即可。
运行 `bun run dev` 后，保存模板会自动重建并刷新页面。

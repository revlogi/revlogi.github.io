import config
import content
import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result
import gleam/string
import listing
import page
import pipeline
import rss
import runtime
import static_pages
import template.{type TemplateError}

pub type Site {
  Site(pages: Dict(String, String), html_count: Int)
}

fn read_template(name: String) -> Result(String, String) {
  runtime.read_text("src/ssg/templates/" <> name <> ".html")
}

pub fn load_templates() -> Result(pipeline.Templates, String) {
  use layout <- result.try(read_template("layout"))
  use nav <- result.try(read_template("nav-item"))
  use post <- result.try(read_template("post"))
  use tag <- result.try(read_template("post-tag"))
  use neighbour <- result.try(read_template("post-neighbour"))
  use index <- result.try(read_template("index"))
  use item <- result.try(read_template("post-list-item"))
  use description <- result.try(read_template("post-description"))
  use list_tag <- result.try(read_template("post-list-tag"))
  use tag_item <- result.try(read_template("tag-item"))
  use tag_page <- result.try(read_template("tag-page"))
  use tags_index <- result.try(read_template("tags-index"))
  use about <- result.try(read_template("about"))
  use friends <- result.try(read_template("friends"))
  use links <- result.try(read_template("links"))
  Ok(pipeline.Templates(
    page.Templates(layout, nav, post, tag, neighbour),
    listing.Templates(
      index,
      item,
      description,
      list_tag,
      tag_item,
      tag_page,
      tags_index,
    ),
    static_pages.Templates(about, friends, links),
  ))
}

pub fn load_rss_templates() -> Result(rss.Templates, String) {
  use feed <- result.try(runtime.read_text("src/ssg/templates/rss.xml"))
  use item <- result.try(runtime.read_text("src/ssg/templates/rss-item.xml"))
  Ok(rss.Templates(feed, item))
}

fn template_error(error: TemplateError, extension: String) -> String {
  error.template_name
  <> "."
  <> extension
  <> ": missing template value \""
  <> error.key
  <> "\""
}

/// Validate and render everything before touching the previous output.
pub fn render_site() -> Result(Site, String) {
  use all_posts <- result.try(content.load_posts())
  let posts = content.visible_posts(all_posts, runtime.include_drafts())
  use about_source <- result.try(runtime.read_text("content/page/about.md"))
  use about_html <- result.try(runtime.render_markdown(about_source))
  use links_source <- result.try(runtime.read_text("content/page/links.md"))
  use links_html <- result.try(runtime.render_markdown(links_source))
  use templates <- result.try(load_templates())
  use pages <- result.try(
    pipeline.render_all(
      config.site(),
      templates,
      list.map(posts, fn(post) { post.article }),
      about_html,
      links_html,
    )
    |> result.map_error(fn(error) { template_error(error, "html") }),
  )
  use rss_templates <- result.try(load_rss_templates())
  use feed <- result.try(
    rss.generate(config.site(), rss_templates, posts)
    |> result.map_error(fn(error) { template_error(error, "xml") }),
  )
  Ok(Site(dict.insert(pages, "/rss.xml", feed), dict.size(pages)))
}

pub fn output_path(url: String) -> String {
  let relative = case string.starts_with(url, "/") {
    True -> string.drop_start(url, 1)
    False -> url
  }
  case string.ends_with(url, "/") {
    True -> relative <> "index.html"
    False -> relative
  }
}

fn emit_into(
  stage: String,
  pages: Dict(String, String),
) -> Result(Nil, String) {
  use _ <- result.try(
    list.try_each(dict.to_list(pages), fn(entry) {
      let #(url, html) = entry
      case url {
        "/rss.xml" -> Ok(Nil)
        _ -> runtime.write_output(stage, output_path(url), html)
      }
    }),
  )
  use _ <- result.try(runtime.copy_output(stage, "public", ".", True))
  use _ <- result.try(runtime.copy_output(
    stage,
    "src/ssg/styles/global.css",
    "style.css",
    False,
  ))
  use _ <- result.try(runtime.copy_output(
    stage,
    "node_modules/katex/dist/katex.min.css",
    "katex.css",
    True,
  ))
  // RSS was written after public assets in the original build as well.
  use _ <- result.try(case dict.get(pages, "/rss.xml") {
    Ok(xml) -> runtime.write_output(stage, "rss.xml", xml)
    Error(Nil) -> Ok(Nil)
  })
  runtime.commit_output(stage)
}

pub fn emit(pages: Dict(String, String)) -> Result(Nil, String) {
  use stage <- result.try(runtime.begin_output())
  let result = emit_into(stage, pages)
  case result {
    Ok(Nil) -> Ok(Nil)
    Error(message) -> {
      runtime.discard_output(stage)
      Error(message)
    }
  }
}

pub fn run() -> Result(Int, String) {
  use site <- result.try(render_site())
  use _ <- result.try(emit(site.pages))
  runtime.print(
    "✓ built " <> int.to_string(site.html_count) <> " pages → dist/",
  )
  Ok(site.html_count)
}

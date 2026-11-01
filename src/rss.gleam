import content.{type Post}
import gleam/dict
import gleam/list
import gleam/result
import gleam/string
import page.{type SiteConfig}
import post_order
import template.{type TemplateError}

pub type Templates {
  Templates(feed: String, item: String)
}

pub fn escape_xml(value: String) -> String {
  value
  |> string.replace("&", "&amp;")
  |> string.replace("<", "&lt;")
  |> string.replace(">", "&gt;")
  |> string.replace("\"", "&quot;")
}

pub fn generate(
  config: SiteConfig,
  templates: Templates,
  posts: List(Post),
) -> Result(String, TemplateError) {
  use items <- result.try(
    posts
    |> post_order.sort_posts(fn(post) { post.article.published_at_ms })
    |> list.try_map(fn(post) {
      let view = post.article.view
      template.substitute(
        "rss-item",
        templates.item,
        dict.from_list([
          #("title", escape_xml(view.title)),
          #("url", config.url <> "/posts/" <> view.slug <> "/"),
          #("description", escape_xml(view.description)),
          #("pubDate", post.rss_date),
        ]),
      )
    }),
  )
  template.substitute(
    "rss",
    templates.feed,
    dict.from_list([
      #("title", escape_xml(config.title)),
      #("url", config.url),
      #("description", escape_xml(config.description)),
      #("feedUrl", config.url <> "/rss.xml"),
      #("items", string.join(items, "\n")),
    ]),
  )
}

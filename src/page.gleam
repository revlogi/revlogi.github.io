import gleam/dict
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import gleam/string
import template.{type TemplateError}

// These are rendering inputs, not the final parsed article model.
pub type PostView {
  PostView(
    slug: String,
    title: String,
    description: String,
    datetime: String,
    date: String,
    tag: String,
    html: String,
  )
}

pub type PostLink {
  PostLink(slug: String, title: String)
}

pub type SiteConfig {
  SiteConfig(title: String, url: String, lang: String, description: String)
}

pub type PageMeta {
  PageMeta(title: String, path: String, description: Option(String))
}

// The runtime loads these files. Composition only sees their source strings.
pub type Templates {
  Templates(
    layout: String,
    nav_item: String,
    post: String,
    post_tag: String,
    post_neighbour: String,
  )
}

pub fn render_post(
  config: SiteConfig,
  templates: Templates,
  post: PostView,
  newer: Option(PostLink),
  older: Option(PostLink),
) -> Result(String, TemplateError) {
  use newer_html <- result.try(render_neighbour(
    templates,
    newer,
    "newer",
    "← Newer",
  ))
  use older_html <- result.try(render_neighbour(
    templates,
    older,
    "older",
    "Older →",
  ))
  use tag <- result.try(case post.tag {
    "" -> Ok("")
    _ ->
      template.substitute(
        "post-tag",
        templates.post_tag,
        dict.from_list([#("tag", post.tag)]),
      )
  })
  use body <- result.try(template.substitute(
    "post",
    templates.post,
    dict.from_list([
      #("title", post.title),
      #("datetime", post.datetime),
      #("date", post.date),
      #("tag", tag),
      #("html", post.html),
      #("newer", newer_html),
      #("older", older_html),
    ]),
  ))
  render_layout(
    config,
    templates,
    PageMeta(post.title, "/posts/" <> post.slug <> "/", Some(post.description)),
    body,
  )
}

pub fn render_layout(
  config: SiteConfig,
  templates: Templates,
  meta: PageMeta,
  body: String,
) -> Result(String, TemplateError) {
  let links = [
    #("About", "/about/"),
    #("Friends", "/friends/"),
    #("Links", "/links/"),
    #("Tags", "/tags/"),
    #("RSS", "/rss.xml"),
  ]
  use nav_items <- result.try(
    list.try_map(links, fn(link) {
      let #(label, path) = link
      let current = case meta.path == path {
        True -> " aria-current=\"page\""
        False -> ""
      }
      template.substitute(
        "nav-item",
        templates.nav_item,
        dict.from_list([
          #("path", path),
          #("current", current),
          #("label", label),
        ]),
      )
    }),
  )
  template.substitute(
    "layout",
    templates.layout,
    dict.from_list([
      #("lang", config.lang),
      #("title", meta.title),
      #("siteTitle", config.title),
      #("description", option.unwrap(meta.description, config.description)),
      #("canonicalUrl", config.url <> meta.path),
      #("navItems", string.concat(nav_items)),
      #("body", body),
    ]),
  )
}

fn render_neighbour(
  templates: Templates,
  neighbour: Option(PostLink),
  direction: String,
  label: String,
) -> Result(String, TemplateError) {
  case neighbour {
    None -> Ok("")
    Some(post) ->
      template.substitute(
        "post-neighbour",
        templates.post_neighbour,
        dict.from_list([
          #("direction", direction),
          #("slug", post.slug),
          #("title", post.title),
          #("label", label),
        ]),
      )
  }
}

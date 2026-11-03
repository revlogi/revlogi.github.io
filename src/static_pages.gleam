import gleam/dict
import gleam/option.{None}
import gleam/result
import page.{type SiteConfig, PageMeta}
import template.{type TemplateError}

pub type Templates {
  Templates(about: String, friends: String, links: String)
}

pub type StaticPage {
  About(html: String)
  Friends
  Links(html: String)
}

pub fn render(
  config: SiteConfig,
  layout: page.Templates,
  templates: Templates,
  kind: StaticPage,
) -> Result(String, TemplateError) {
  let #(name, source, title, path, values) = case kind {
    About(html) -> #(
      "about",
      templates.about,
      "About",
      "/about/",
      dict.from_list([#("html", html)]),
    )
    Friends -> #(
      "friends",
      templates.friends,
      "Friends",
      "/friends/",
      dict.new(),
    )
    Links(html) -> #(
      "links",
      templates.links,
      "Links",
      "/links/",
      dict.from_list([#("html", html)]),
    )
  }
  use body <- result.try(template.substitute(name, source, values))
  page.render_layout(config, layout, PageMeta(title, path, None), body)
}

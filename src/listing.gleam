import gleam/dict
import gleam/int
import gleam/list
import gleam/option.{None}
import gleam/result
import gleam/string
import page.{type PostView, type SiteConfig, PageMeta}
import template.{type TemplateError}

pub type Templates {
  Templates(
    index: String,
    post_list_item: String,
    post_description: String,
    post_list_tag: String,
    tag_item: String,
    tag_page: String,
    tags_index: String,
  )
}

pub type TagCount {
  TagCount(tag: String, count: Int)
}

pub fn render_post_list_item(
  templates: Templates,
  post: PostView,
) -> Result(String, TemplateError) {
  use description <- result.try(case post.description {
    "" -> Ok("")
    _ ->
      template.substitute(
        "post-description",
        templates.post_description,
        dict.from_list([#("description", post.description)]),
      )
  })
  use tag <- result.try(case post.tag {
    "" -> Ok("")
    _ ->
      template.substitute(
        "post-list-tag",
        templates.post_list_tag,
        dict.from_list([#("tag", post.tag)]),
      )
  })
  template.substitute(
    "post-list-item",
    templates.post_list_item,
    dict.from_list([
      #("slug", post.slug),
      #("title", post.title),
      #("description", description),
      #("datetime", post.datetime),
      #("date", post.date),
      #("tag", tag),
    ]),
  )
}

/// Render posts in the supplied display order; sorting belongs upstream.
pub fn render_index(
  config: SiteConfig,
  layout: page.Templates,
  templates: Templates,
  posts: List(PostView),
) -> Result(String, TemplateError) {
  use items <- result.try(post_items(templates, posts))
  use body <- result.try(template.substitute(
    "index",
    templates.index,
    dict.from_list([#("items", items)]),
  ))
  page.render_layout(config, layout, PageMeta("Home", "/", None), body)
}

/// The caller selects this tag's posts and their display order.
pub fn render_tag_page(
  config: SiteConfig,
  layout: page.Templates,
  templates: Templates,
  tag: String,
  posts: List(PostView),
) -> Result(String, TemplateError) {
  use items <- result.try(post_items(templates, posts))
  use body <- result.try(template.substitute(
    "tag-page",
    templates.tag_page,
    dict.from_list([#("tag", tag), #("items", items)]),
  ))
  page.render_layout(
    config,
    layout,
    PageMeta("# " <> tag, "/tags/" <> tag <> "/", None),
    body,
  )
}

/// Count ties keep the supplied order, matching Map insertion order in TS.
pub fn render_tags_index(
  config: SiteConfig,
  layout: page.Templates,
  templates: Templates,
  counts: List(TagCount),
) -> Result(String, TemplateError) {
  let sorted = list.sort(counts, by: fn(a, b) { int.compare(b.count, a.count) })
  use items <- result.try(
    list.try_map(sorted, fn(item) {
      template.substitute(
        "tag-item",
        templates.tag_item,
        dict.from_list([
          #("tag", item.tag),
          #("count", int.to_string(item.count)),
        ]),
      )
    }),
  )
  use body <- result.try(template.substitute(
    "tags-index",
    templates.tags_index,
    dict.from_list([#("items", string.join(items, "\n  "))]),
  ))
  page.render_layout(config, layout, PageMeta("Tags", "/tags/", None), body)
}

fn post_items(
  templates: Templates,
  posts: List(PostView),
) -> Result(String, TemplateError) {
  use items <- result.try(
    list.try_map(posts, fn(post) { render_post_list_item(templates, post) }),
  )
  Ok(string.join(items, "\n  "))
}

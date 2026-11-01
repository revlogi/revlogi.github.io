import gleam/dict.{type Dict}
import gleam/list
import gleam/option
import gleam/result
import listing
import page.{type PostView, type SiteConfig}
import post_order
import static_pages
import template.{type TemplateError}

pub type Article {
  Article(view: PostView, published_at_ms: Int)
}

pub type Templates {
  Templates(
    layout: page.Templates,
    listing: listing.Templates,
    static_pages: static_pages.Templates,
  )
}

pub type TagGroup {
  TagGroup(tag: String, posts: List(PostView))
}

/// Complete HTML page collection. Source parsing, RSS and disk writes are external.
pub fn render_all(
  config: SiteConfig,
  templates: Templates,
  articles: List(Article),
  links_html: String,
) -> Result(Dict(String, String), TemplateError) {
  let sorted =
    post_order.sort_posts(articles, fn(article) { article.published_at_ms })
  let views = list.map(sorted, fn(article) { article.view })
  use home <- result.try(listing.render_index(
    config,
    templates.layout,
    templates.listing,
    views,
  ))
  use about <- result.try(static_pages.render(
    config,
    templates.layout,
    templates.static_pages,
    static_pages.About,
  ))
  use friends <- result.try(static_pages.render(
    config,
    templates.layout,
    templates.static_pages,
    static_pages.Friends,
  ))
  use links <- result.try(static_pages.render(
    config,
    templates.layout,
    templates.static_pages,
    static_pages.Links(links_html),
  ))
  use post_pages <- result.try(
    sorted
    |> post_order.with_neighbours
    |> list.try_map(fn(item) {
      let post = item.post.view
      use html <- result.try(page.render_post(
        config,
        templates.layout,
        post,
        option.map(item.newer, post_link),
        option.map(item.older, post_link),
      ))
      Ok(#("/posts/" <> post.slug <> "/", html))
    }),
  )
  let groups = group_tags(views)
  use tag_pages <- result.try(
    list.try_map(groups, fn(group) {
      use html <- result.try(listing.render_tag_page(
        config,
        templates.layout,
        templates.listing,
        group.tag,
        group.posts,
      ))
      Ok(#("/tags/" <> group.tag <> "/", html))
    }),
  )
  let counts =
    list.map(groups, fn(group) {
      listing.TagCount(group.tag, list.length(group.posts))
    })
  use tags <- result.try(listing.render_tags_index(
    config,
    templates.layout,
    templates.listing,
    counts,
  ))
  // A dictionary preserves the old Map's last-write-wins route behavior.
  // Its iteration order is not part of the output contract.
  Ok(
    [
      [
        #("/", home),
        #("/about/", about),
        #("/friends/", friends),
        #("/links/", links),
      ],
      post_pages,
      tag_pages,
      [#("/tags/", tags)],
    ]
    |> list.flatten
    |> dict.from_list,
  )
}

/// Keep tag first-seen order and the supplied post order within each tag.
/// Empty tags are excluded, just as in the current TypeScript build.
pub fn group_tags(posts: List(PostView)) -> List(TagGroup) {
  let #(groups, tag_order) =
    list.fold(posts, #(dict.new(), []), fn(state, post) {
      let #(groups, order) = state
      case post.tag {
        "" -> state
        tag ->
          case dict.get(groups, tag) {
            Ok(items) -> #(dict.insert(groups, tag, [post, ..items]), order)
            Error(Nil) -> #(dict.insert(groups, tag, [post]), [tag, ..order])
          }
      }
    })
  tag_order
  |> list.reverse
  |> list.map(fn(tag) {
    // Every tag in tag_order was inserted into groups in the same fold.
    let assert Ok(items) = dict.get(groups, tag)
    TagGroup(tag, list.reverse(items))
  })
}

fn post_link(article: Article) -> page.PostLink {
  page.PostLink(article.view.slug, article.view.title)
}

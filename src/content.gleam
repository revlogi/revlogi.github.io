import gleam/dynamic.{type Dynamic}
import gleam/dynamic/decode
import gleam/list
import gleam/result
import gleam/string
import page
import pipeline
import runtime
import slug

pub type Metadata {
  Metadata(
    title: String,
    description: String,
    publish_date: String,
    tag: String,
    draft: Bool,
  )
}

pub type Post {
  Post(
    article: pipeline.Article,
    rss_date: String,
    source_path: String,
    draft: Bool,
  )
}

pub fn validate_metadata(
  path: String,
  data: Dynamic,
) -> Result(Metadata, String) {
  let decoder = {
    use title <- decode.field("title", decode.string)
    use date <- decode.field("publishDate", decode.string)
    use description <- decode.optional_field("description", "", decode.string)
    use tag <- decode.optional_field("tag", "", decode.string)
    use draft <- decode.optional_field("draft", False, decode.bool)
    decode.success(Metadata(title, description, date, tag, draft))
  }
  use metadata <- result.try(
    decode.run(data, decoder)
    |> result.map_error(fn(errors) {
      path
      <> ": "
      <> string.join(
        list.map(errors, fn(error) {
          string.join(error.path, ".")
          <> ": expected "
          <> error.expected
          <> ", found "
          <> error.found
        }),
        "; ",
      )
    }),
  )
  case string.trim(metadata.title) {
    "" -> Error(path <> ": title must not be blank")
    _ -> Ok(metadata)
  }
}

pub fn split_frontmatter(raw: String) -> #(String, String) {
  let raw = string.replace(raw, "\r\n", "\n")
  case string.starts_with(raw, "---\n") {
    False -> #("", raw)
    True ->
      case string.split_once(string.drop_start(raw, 3), "\n---") {
        Error(Nil) -> #("", raw)
        Ok(#(header, body)) -> {
          let body = case string.starts_with(body, "\n") {
            True -> string.drop_start(body, 1)
            False -> body
          }
          #(string.trim(header), body)
        }
      }
  }
}

pub fn parse_post(path: String, raw: String) -> Result(Post, String) {
  let #(header, body) = split_frontmatter(raw)
  use data <- result.try(
    runtime.parse_yaml(header)
    |> result.map_error(fn(message) { path <> ": " <> message }),
  )
  use metadata <- result.try(validate_metadata(path, data))
  use dates <- result.try(
    runtime.parse_date(metadata.publish_date)
    |> result.map_error(fn(message) { path <> ": " <> message }),
  )
  let #(timestamp, iso, display, rss_date) = dates
  use html <- result.try(
    runtime.render_markdown(body)
    |> result.map_error(fn(message) { path <> ": Markdown: " <> message }),
  )
  let view =
    page.PostView(
      slug.derive_slug(runtime.relative_post_path(path)),
      metadata.title,
      metadata.description,
      iso,
      display,
      metadata.tag,
      html,
    )
  Ok(Post(pipeline.Article(view, timestamp), rss_date, path, metadata.draft))
}

/// Apply publication policy once, before HTML pages, navigation, tags and RSS.
pub fn visible_posts(posts: List(Post), include_drafts: Bool) -> List(Post) {
  list.filter(posts, fn(post) { include_drafts || !post.draft })
}

pub fn load_posts() -> Result(List(Post), String) {
  use paths <- result.try(runtime.scan_files())
  list.try_map(paths, fn(path) {
    use source <- result.try(runtime.read_text(path))
    parse_post(path, source)
  })
}

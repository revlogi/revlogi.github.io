import build
import gleam/string
import runtime

pub fn should_rebuild(path: String) -> Bool {
  !string.contains(path, ".DS_Store")
  && !string.ends_with(path, ".swp")
  && !string.ends_with(path, ".tmp")
  && !string.contains(path, "4913")
}

pub fn mime_type(extension: String) -> String {
  case extension {
    ".html" -> "text/html; charset=utf-8"
    ".css" -> "text/css; charset=utf-8"
    ".js" | ".mjs" -> "text/javascript; charset=utf-8"
    ".xml" -> "application/rss+xml; charset=utf-8"
    ".jpg" | ".jpeg" -> "image/jpeg"
    ".png" -> "image/png"
    ".svg" -> "image/svg+xml"
    ".webmanifest" -> "application/manifest+json"
    ".woff" -> "font/woff"
    ".woff2" -> "font/woff2"
    _ -> "application/octet-stream"
  }
}

@external(javascript, "./server.mjs", "startDev")
pub fn start_server(
  directories: List(String),
  should_rebuild: fn(String) -> Bool,
  mime_type: fn(String) -> String,
  build_command: List(String),
) -> Nil

pub fn main() -> Nil {
  case build.run() {
    Error(message) -> runtime.fail(message)
    Ok(_) ->
      start_server(
        ["content", "src", "public", "gleam.toml", "manifest.toml"],
        should_rebuild,
        mime_type,
        ["gleam", "run", "--module", "revlogi_blog"],
      )
  }
}

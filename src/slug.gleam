import gleam/string

/// Derive a slug from a normalized path relative to content/post/.
/// The caller handles OS paths; this function expects forward slashes.
pub fn derive_slug(post_relative_path: String) -> String {
  let stem = strip_suffix(post_relative_path, ".md")

  case stem {
    // Preserve the existing root-index behavior, even though it is surprising.
    "index" -> "post"
    _ -> strip_suffix(stem, "/index")
  }
}

fn strip_suffix(value: String, suffix: String) -> String {
  case string.ends_with(value, suffix) {
    True -> string.drop_end(value, string.length(suffix))
    False -> value
  }
}

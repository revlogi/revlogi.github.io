import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string

pub type TemplateError {
  MissingValue(template_name: String, key: String)
}

/// Substitute ASCII word placeholders once, without escaping inserted HTML.
/// Disk loading and number-to-string conversion belong to the runtime boundary.
pub fn substitute(
  name: String,
  source: String,
  values: Dict(String, String),
) -> Result(String, TemplateError) {
  // Use codepoints, not graphemes: a combining mark after `}}` must not hide it.
  let chars =
    source
    |> string.to_utf_codepoints
    |> list.map(fn(cp) { string.from_utf_codepoints([cp]) })
  scan(chars, name, values, [])
}

fn scan(
  chars: List(String),
  name: String,
  values: Dict(String, String),
  acc: List(String),
) -> Result(String, TemplateError) {
  case chars {
    [] -> Ok(acc |> list.reverse |> string.concat)
    ["{", "{", ..rest] ->
      case read_key(rest, []) {
        Some(#(key, after)) ->
          case dict.get(values, key) {
            Ok(value) -> scan(after, name, values, [value, ..acc])
            Error(Nil) -> Error(MissingValue(name, key))
          }
        // Consume only one brace so an inner placeholder can still match.
        None -> scan(["{", ..rest], name, values, ["{", ..acc])
      }
    [char, ..rest] -> scan(rest, name, values, [char, ..acc])
  }
}

fn read_key(
  chars: List(String),
  acc: List(String),
) -> Option(#(String, List(String))) {
  case chars {
    ["}", "}", ..rest] ->
      case acc {
        [] -> None
        _ -> Some(#(acc |> list.reverse |> string.concat, rest))
      }
    [char, ..rest] ->
      case
        string.contains(
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_",
          char,
        )
      {
        True -> read_key(rest, [char, ..acc])
        False -> None
      }
    [] -> None
  }
}

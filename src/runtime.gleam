import gleam/dynamic.{type Dynamic}

@external(javascript, "./runtime_ffi.mjs", "scanFiles")
pub fn scan_files() -> Result(List(String), String)

@external(javascript, "./runtime_ffi.mjs", "readText")
pub fn read_text(path: String) -> Result(String, String)

@external(javascript, "./runtime_ffi.mjs", "relativePostPath")
pub fn relative_post_path(path: String) -> String

@external(javascript, "./runtime_ffi.mjs", "parseYaml")
pub fn parse_yaml(source: String) -> Result(Dynamic, String)

@external(javascript, "./runtime_ffi.mjs", "renderMarkdown")
pub fn render_markdown(source: String) -> Result(String, String)

@external(javascript, "./runtime_ffi.mjs", "parseDate")
pub fn parse_date(
  value: String,
) -> Result(#(Int, String, String, String), String)

@external(javascript, "./runtime_ffi.mjs", "includeDrafts")
pub fn include_drafts() -> Bool

@external(javascript, "./runtime_ffi.mjs", "beginOutput")
pub fn begin_output() -> Result(String, String)

@external(javascript, "./runtime_ffi.mjs", "writeOutput")
pub fn write_output(
  stage: String,
  path: String,
  html: String,
) -> Result(Nil, String)

@external(javascript, "./runtime_ffi.mjs", "copyOutput")
pub fn copy_output(
  stage: String,
  source: String,
  destination: String,
  optional: Bool,
) -> Result(Nil, String)

@external(javascript, "./runtime_ffi.mjs", "commitOutput")
pub fn commit_output(stage: String) -> Result(Nil, String)

@external(javascript, "./runtime_ffi.mjs", "discardOutput")
pub fn discard_output(stage: String) -> Nil

@external(javascript, "./runtime_ffi.mjs", "print")
pub fn print(message: String) -> Nil

@external(javascript, "./runtime_ffi.mjs", "fail")
pub fn fail(message: String) -> Nil

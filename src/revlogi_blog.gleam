import build
import runtime

pub fn main() -> Nil {
  case build.run() {
    Ok(_) -> Nil
    Error(message) -> runtime.fail(message)
  }
}

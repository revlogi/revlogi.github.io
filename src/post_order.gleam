import gleam/int
import gleam/list
import gleam/option.{type Option, None, Some}

pub type PostWithNeighbours(a) {
  PostWithNeighbours(post: a, newer: Option(a), older: Option(a))
}

/// Newest first. The caller supplies a timestamp accessor for its article type.
/// Equal timestamps retain their input order.
pub fn sort_posts(posts: List(a), published_at: fn(a) -> Int) -> List(a) {
  list.sort(posts, by: fn(a, b) {
    int.compare(published_at(b), published_at(a))
  })
}

/// Attach adjacent posts without discarding their payloads.
/// The caller must supply posts in display order.
pub fn with_neighbours(posts: List(a)) -> List(PostWithNeighbours(a)) {
  neighbours_loop(posts, None, [])
}

fn neighbours_loop(
  remaining: List(a),
  newer: Option(a),
  acc: List(PostWithNeighbours(a)),
) -> List(PostWithNeighbours(a)) {
  case remaining {
    [] -> list.reverse(acc)
    [post, ..rest] -> {
      let older = case rest {
        [] -> None
        [next, ..] -> Some(next)
      }
      let item = PostWithNeighbours(post, newer, older)
      neighbours_loop(rest, Some(post), [item, ..acc])
    }
  }
}

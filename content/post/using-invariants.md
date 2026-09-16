---
title: "Using Invariants"
description: "Reconstructing a C exception interface by identifying the invariant behind its control flow"
publishDate: "5 August 2026"
tag: software
---

Recently, I've been studying [C Interfaces and Implementations](https://goodreads.com/book/show/475432.C_Interfaces_and_Implementations), which presents a collection of reusable interfaces and their implementations.

While working through the book and typing out its code, I often feel that reproducing an implementation is not the same as truly understanding it. I can see how the code works, but I cannot always explain why it must be written that way.

Matklad's post, [What Is an Invariant?](https://matklad.github.io/2023/10/06/what-is-an-invariant.html), gave me a useful way to approach this problem. Instead of merely copying each implementation, I want to reconstruct it by first identifying the properties that must remain true as the program evolves.

This article is an attempt to apply that approach to the exception interface from the book.

## Exceptions

> This section assumes basic familiarity with `setjmp` and `longjmp`.

Using `setjmp` and `longjmp` directly to handle exceptions in C is complicated and error-prone, so we want to hide these primitives behind a small interface composed of macros and functions.

The interface looks like this:

> For simplicity, I keep the book's brace-less syntax here. See [c-foundations](https://github.com/revlogi/c-foundations) for a more sophisticated implementation.

```c
TRY
    S
    RAISE(e)
EXCEPT(e_1)
    S_1
EXCEPT(e_2)
    S_2
ELSE
    S_0
END_TRY
```

Here, `S` is executed first. If it raises `e_1` or `e_2`, the corresponding handler is executed. If it raises a different exception, `S_0` is executed.

To make cleanup explicit on both the normal and exceptional paths, the interface also provides a `FINALLY` clause:

```c
TRY
    S
FINALLY
    S_1
END_TRY
```

`S_1` is executed whether `S` finishes normally or leaves by raising an exception.

### Implementation

Before jumping right into the interface, we need to understand the state that changes during execution.

Each active `TRY` block installs an exception frame. Because `TRY` blocks can be nested, these frames form a stack.

```c
typedef struct Exception Exception;
struct Exception {
    const char *reason;
};

typedef struct Except_Frame Except_Frame;
struct Except_Frame {
    Except_Frame *prev;
    jmp_buf env;
    const char *file;
    int line;
    const Exception *exception;
};
```

The frame at the top of the stack represents the innermost active `TRY` block and is therefore the first one that should receive a raised exception. We maintain a pointer to that frame.

```c
extern Except_Frame *Except_stack;
```

This gives us the central invariant of the implementation:

> `Except_stack` always points to the nearest enclosing `TRY` block that is still able to catch an exception.

The phrase "still able to catch an exception" is important. Once control has entered one of a frame's handlers, that frame must no longer be on the stack.

We can now describe the required state transitions:

| Operation | Required state change |
|-----------|-----------------------|
| Enter `TRY` | Push one frame onto the stack |
| Finish normally | Pop that frame |
| Raise an exception | Record the exception and pop the receiving frame |
| Enter a handler | Mark the exception as handled |
| Execute `FINALLY` | Run the cleanup code while preserving any unhandled exception |
| Reach `END_TRY` | Re-raise the exception if it remains unhandled |

These transitions provide a blueprint for the macros.

The macros expand into fragments of a single `do`-`while` statement. Using this structure allows the complete `TRY` statement to behave like an ordinary C statement, including when it appears inside an `if` statement.

```c
do {
    create an exception frame and push it onto Except_stack
    if (initial return from setjmp) {
        S
    } else if (e_1) {
        S_1
    } else if (e_2) {
        S_2
    } else {
        S_0
    }
    if (there is an unhandled exception) {
        RERAISE;
    }
} while (0);
```

We also need a flag that records the current control-flow state:

```c
enum {
    Except_entered = 0,
    Except_raised,
    Except_handled,
    Except_finalized
};
```

`Except_entered` must be zero because `setjmp` returns zero when the frame is first initialized. When execution returns through `longjmp`, it returns a nonzero value instead.

`Except_finalized` represents normal execution that has already passed through a `FINALLY` clause. This distinction is necessary because `FINALLY` removes the frame itself; without a separate state, `END_TRY` could attempt to remove the same frame again.

`TRY` creates a frame, links it to the previous frame, and makes it the new top frame:

```c
#define TRY                                                                    \
    do {                                                                       \
        volatile int Except_flag;                                              \
        Except_Frame Except_frame;                                             \
        Except_frame.prev = Except_stack;                                      \
        Except_stack = &Except_frame;                                          \
        Except_flag = setjmp(Except_frame.env);                                \
        if (Except_flag == Except_entered) {
```

`Except_flag` is declared `volatile` because `setjmp` and `longjmp` impose special rules on automatic local variables. In particular, the value of a non-`volatile` local variable that is modified between `setjmp` and `longjmp` may become indeterminate after control returns through `longjmp`.

If the protected statement finishes normally, `EXCEPT` removes its frame from the stack. If control arrives through `longjmp` and the exception matches `e`, it marks the exception as handled:

```c
#define EXCEPT(e)                                                              \
    if (Except_flag == Except_entered)                                         \
        Except_stack = Except_stack->prev;                                     \
    }                                                                          \
    else if (Except_frame.exception == &(e)) {                                 \
        Except_flag = Except_handled;
```

`ELSE` has the same cleanup responsibility after normal completion, but it accepts any exception that was not matched:

```c
#define ELSE                                                                   \
    if (Except_flag == Except_entered)                                         \
        Except_stack = Except_stack->prev;                                     \
    }                                                                          \
    else {                                                                     \
        Except_flag = Except_handled;
```

`FINALLY` removes the frame after normal execution. If no exception was raised, the flag is changed to `Except_finalized` so that `END_TRY` knows that the frame has already been removed:

```c
#define FINALLY                                                                \
    if (Except_flag == Except_entered)                                         \
        Except_stack = Except_stack->prev;                                     \
    }                                                                          \
    {                                                                          \
        if (Except_flag == Except_entered)                                     \
            Except_flag = Except_finalized;
```

`END_TRY` performs the final normal-path cleanup. It then re-raises any exception that remains unhandled.

```c
#define END_TRY                                                                \
    if (Except_flag == Except_entered)                                         \
        Except_stack = Except_stack->prev;                                     \
    }                                                                          \
    if (Except_flag == Except_raised)                                          \
        RERAISE;                                                               \
    }                                                                          \
    while (0)                                                                  \
        ;
```

`RAISE` and `RERAISE` both delegate to `Except_raise`:

```c
#define RAISE(e) Except_raise(&(e), __FILE__, __LINE__)
#define RERAISE                                                                \
    Except_raise(Except_frame.exception, Except_frame.file, Except_frame.line)
```

The order of operations in `Except_raise` is essential. It first saves the top frame in `p`, records the exception in that frame, and then removes the frame from `Except_stack` before calling `longjmp`.

```c
void Except_raise(const Exception *e, const char *file, int line) {
    Except_Frame *p = Except_stack;

    assert(e);
    if (p == NULL) {
        fprintf(stderr, "Uncaught exception");
        if (e->reason)
            fprintf(stderr, " %s", e->reason);
        else
            fprintf(stderr, " at %p", (const void *)e);
        if (file && line > 0)
            fprintf(stderr, " raised at %s:%d\n", file, line);
        fprintf(stderr, "aborting...\n");
        fflush(stderr);
        abort();
    }

    p->exception = e;
    p->file = file;
    p->line = line;
    Except_stack = Except_stack->prev;
    longjmp(p->env, Except_raised);
}
```

Once the invariant is explicit, most of the stange-look details stop being obscure. Although the macros are still tricky, the invariant turns them from syntax to memorize into consequences that can be derived.
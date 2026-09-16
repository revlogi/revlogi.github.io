---
title: "Recursion without names"
description: "y combinator"
publishDate: "6 July 2026"
tag: computing
---

## Why Names aren't enough

Recursion is a powerful tool, and writing recursive function is a must-learn skill for every programmer. A key part in recursion is invoking the function itself. This process is actually a self-referencing process, quite like the second attempt in [writing self-reproducing program](https://revlogi.github.io/posts/self-reproducing/) where the program simply reads its own dource file from memory.

However, theoretical computer scientist are rarely satisfied with this kind of "practical" solution. Just like how a true Quine program forbids any inputs, these theoretists ask a seemingly unreasonable question: Can we achieve recursion without giving the function a name?

Why are they always so "unsatisfied"? It's not because they want to make our lives harder as programmers. Rather, it's about pushing the boundaries of computation to its absolute limits. Function call with name relies on name bindings that the compiler or interpreter provide and the theoretists want to know: without the "compiler magic", does the pure mathematical structure of computation still allow for recursive loops?

## A Pragmatic Lambda Calculus

The pursuit of absolute minimalism leads us directly to [lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus). Introduced by Alonzo Church in the 1930s, it serves as a turing complete formal system for expressing computation. With no loops, no assignments and no names, there are only anonymous functions and function applications. The central concept in lambda calculus is `expression`. The only keywords used in the language are λ and the dot and the syntax is extremely simple (in the following, I will use \ to replace λ):

```
<expression> := <name> |<function> |<application>
<function> := \ <name>.<expression>
<application> := <expression><expression>
```

Function can be applied to expressions. An example of an application is `(\x.x)y` which evaluates to `y`.

To give you a concrete feel of how this minimalist world operates, I've built a simple lambda calculus interpreter [lamb](https://github.com/revlogi/lamb-cpp). To illustrate better, I added bindings to lambda calculus, the syntax is as follows:

```
> define IDENTITY \x.x
Defined: IDENTITY
> IDENTITY y
y
```

You can have a hands-on experience with this lambda calculus interpreter using the interactive REPL.

So, without names, how can we compose recursive functions? Let's take factorial function as an example to see the amazing solution to recursion in lambda calculus.

## Writing Factorial

First question, there're even no built-in numbers in lambda calculus, how can we represent them. The answer is quite simple, we use the number of nested layers to represent numbers. You can think the wrappers (f in the following) as a succ function:

```
> define 0 \f.\x.x
Defined: 0
> define 1 \f.\x.f a
Defined: 1
> define 2 \f.\x.f (f a)
Defined: 2
> define 3 \f.\x.f (f (f a))
Defined: 4
```

OK, now we have numbers, but how can we write recursion?

In a normal programming language like python, a classic way to write factorial function is like this:

```python
def fac(n):
  if n == 0:
    return 1
  return n * fac(n - 1)
```


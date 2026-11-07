---
title: "Finding the Celebrity"
description: "Using elimination and recursion to find a party celebrity with at most 3n - 4 questions"
publishDate: "6 August 2026"
tags: [algorithms]
---

> A celebrity at a party is someone whom everyone knows, yet who knows no one. Suppose that you are at a party with $n$ people. For any pair of people $A$ and $B$, you can ask $A$ whether they know $B$ and receive an honest answer. Give a recursive algorithm that determines whether the party includes a celebrity, and if so who, by asking at most $3n-4$ questions.

This problem comes from the [Practice Problems for Note 3 in CS 70, Summer 2026](https://www.eecs70.org/assets/pdf/notes/n3.pdf). I found its solution particularly elegant because a seemingly global property can be determined through a simple process of elimination.

## One Question, One Elimination

The key observation is that a single question allows us to rule out at least one of the two people involved. Suppose we ask $A$ whether they know $B$.

- If $A$ knows $B$, then $A$ cannot be a celebrity.
- If $A$ does not know $B$, then $B$ cannot be a celebrity.

Regardless of the answer, we can safely eliminate one of them.

## Finding the Only Remaining Candidate

Choose any person as the initial candidate, then compare that candidate with each remaining person. For a candidate `c` and another person `p`:

- If `c` knows `p`, eliminate `c` and make `p` the new candidate.
- If `c` does not know `p`, eliminate `p` and keep `c` as the candidate.

After $n-1$ questions, exactly one candidate remains. In pseudocode:

```python
candidate = people[0]

for person in people[1:]:
    if Ask(candidate, person):
        candidate = person
```

Surviving this elimination phase does not prove that the candidate is a celebrity; it only proves that everyone else is not. We still need to verify that, for every other person `p`:

1. the candidate does not know `p`, and
2. `p` knows the candidate.

There are $2(n-1)$ such relationships. However, the final candidate participated in at least one question during the elimination phase, so one of those relationships is already known. Verification therefore requires at most $2n-3$ additional questions. Together with the $n-1$ elimination questions, the total is

$$
(n-1)+(2n-3)=3n-4.
$$

## Making It Recursive

The same idea leads naturally to a recursive algorithm. Assume $n \ge 2$. Ask whether $A$ knows $B$, and use the answer to eliminate one of them; call the eliminated person `x`. Since `x` cannot be a celebrity, we can recursively search among the remaining $n-1$ people.

If the recursive call returns no celebrity, then the original group has no celebrity either. Otherwise, suppose it returns a candidate `c`. The recursive call has already verified `c` against everyone except `x`, so only two relationships remain to be checked: `x` must know `c`, and `c` must not know `x`.

```text
FindCelebrity(P):
    if |P| == 2:
        let P = {A, B}

        ab = Ask(A, B)
        ba = Ask(B, A)

        if ab and not ba:
            return B

        if ba and not ab:
            return A

        return NONE

    choose two distinct people A and B from P

    if Ask(A, B):
        x = A
    else:
        x = B

    c = FindCelebrity(P without x)

    if c == NONE:
        return NONE

    if Ask(x, c) and not Ask(c, x):
        return c

    return NONE
```

## Counting the Questions

Let $Q(n)$ denote the maximum number of questions asked by `FindCelebrity` on a group of $n$ people. The base case asks two questions, so

$$
Q(2)=2=3\cdot2-4.
$$

For $n>2$, the algorithm asks at most three questions outside the recursive call:

- one question to eliminate either $A$ or $B$,
- one to determine whether `x` knows `c`, and
- one to determine whether `c` knows `x`.

Therefore,

$$
Q(n) \le Q(n-1)+3.
$$

Applying this recurrence gives

$$
Q(n) \le 2+3(n-2)=3n-4.
$$

Thus, the recursive algorithm satisfies the required bound.

## Iteration and Recursion

The iterative and recursive approaches rely on the same elimination principle, but they organize verification differently:

- **Iterative:** eliminate everyone but one candidate, then verify that candidate.
- **Recursive:** eliminate one person, solve the smaller problem, then verify the returned candidate against the eliminated person.

The central idea is to use every answer to discard someone who cannot be the celebrity. Once the problem is viewed as elimination rather than exhaustive checking, both the iterative and recursive solutions—and the linear question bound—follow naturally.

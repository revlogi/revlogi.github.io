---
title: "Proof of Sylvester's Rank Inequality"
description: "This post is for testing the draft post functionality"
publishDate: "23 October 2025"
tags: ["linear algebra"]
---
$$\operatorname{rank}(AB) \ge \operatorname{rank}(A) + \operatorname{rank}(B) - n$$

Where $A: s \times n \quad B:n\times m$

## I. Using Block Matrices

$$\begin{bmatrix} I_n & 0 \\ -A & I_{s} \end{bmatrix}\begin{bmatrix} I_n & B \\ A & 0 \end{bmatrix} \begin{bmatrix} I_n & -B \\ 0 & I_m \end{bmatrix} = \begin{bmatrix} I_n & 0 \\ 0 & -AB \end{bmatrix} $$

Therefore:

$$r(A) + r(B) \le r\begin{bmatrix} I_n & B \\ A & 0 \end{bmatrix} = r\begin{bmatrix} I_n & 0 \\ 0 & -AB \end{bmatrix} = n + r(-AB) = n + r(AB) $$

A similar approach can be used to prove a stronger conclusion (Frobenius Rank Inequality): $$r(AB) + r(BC) \le r(ABC) + r(B) $$

Proof:

$$r(ABC) + r(BC) = r\begin{bmatrix} 0 & B \\ ABC & 0 \end{bmatrix} = r\begin{bmatrix} -BC & B \\ ABC & 0 \end{bmatrix} = r\begin{bmatrix} -BC & B \\ 0 & AB \end{bmatrix} \ge r(AB) + r(BC)$$

By setting $BC = I_n$​, the original conclusion can be derived.

## II. Using Equivalent Normal Form (Rank Normal Form)

Suppose there exist invertible matrices P and Q such that:
$$PAQ = \begin{bmatrix} I_r & 0 \\ 0 & 0 \end{bmatrix} $$

Where $r = r(A)$.

Let:

$$Q^{-1}B = \begin{bmatrix} B_1 \\ B_0 \end{bmatrix} $$

Where $B_1$​ is a matrix with $r(A)$ rows.

Thus:

$$r(AB) = r(PAQ Q^{-1}B) = r\left( \begin{bmatrix} I_r & 0 \\ 0 & 0 \end{bmatrix} \begin{bmatrix} B_1 \\ B_0 \end{bmatrix} \right) = r\begin{bmatrix} B_1 \\ 0 \end{bmatrix} $$

Since:

$$r\begin{bmatrix} B_1 \\ 0 \end{bmatrix} + n - r(A) \ge r\begin{bmatrix} B_1 \\ B_0 \end{bmatrix} = r(Q^{-1}B) = r(B) $$

Therefore:

$$r(AB) + n - r(A) \ge r(B) $$

## III. Perspective of Linear Mappings

Consider $A: R^n \to R^s\quad B: R^m \to R^n$

By the Rank-Nullity Theorem:
$$\dim N(A) + \dim R(A) = n,\quad r(A) = \dim R(A) $$

To prove the conclusion:

$$r(AB) \ge r(A) + r(B) - n$$

Which is equivalent to:

$$r(AB) - n \ge r(A) - n + r(B) - n$$

This is equivalent to:

$$\dim N(AB) \le \dim N(B) + \dim N(A)$$

We know that:

$$N(AB) = \{ x \in \mathbb{R}^m \mid Bx \in N(A) \}$$

Thus:

$$\dim N(AB) = \dim N(B) + \dim(R(B) \cap N(A)) \le \dim N(B) + \dim N(A) $$

Thus, the original proposition is proven.

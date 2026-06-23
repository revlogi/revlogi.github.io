---
title: "Understand Cross Product"
description: "a quick note on cross product"
publishDate: "11 January 2026"
---

Let two vectors be defined as:
$$
\vec{v} = (v_1, v_2, v_3)
$$
$$
\vec{w} = (w_1, w_2, w_3)
$$

## The Cross Product as a Linear Map
We define an unknown vector $\vec{n} = [n_x \ n_y \ n_{z}]$ such that its dot product with any vector $\vec{r} = \begin{bmatrix} x \\ y \\ z \end{bmatrix}$ equals the determinant of the matrix formed by $\vec{r}, \vec{v}, \text{and } \vec{w}$:

$$
\underbrace{[n_x \ n_y \ n_z]}_{\vec{n}^T} \begin{bmatrix} x \\ y \\ z \end{bmatrix} = \det(\vec{r}, \vec{v}, \vec{w}) = \begin{vmatrix} x & v_1 & w_1 \\ y & v_2 & w_2 \\ z & v_3 & w_3 \end{vmatrix}
$$

Here, the vector $\vec{n}$ representing this transformation is the **Cross Product** ($\vec{v} \times \vec{w}$).

## Geometric Interpretation
To find the components of this "Target Vector" (the normal vector), we typically expand using basis vectors $\mathbf{i}, \mathbf{j}, \mathbf{k}$:

$$
\vec{n} = \begin{vmatrix} \mathbf{i} & v_1 & w_1 \\ \mathbf{j} & v_2 & w_2 \\ \mathbf{k} & v_3 & w_3 \end{vmatrix}
$$

### Understanding "Height" and "Area"
The geometric meaning of the determinant (Scalar Triple Product) is the **Volume of the Parallelepiped** spanned by $\vec{r}$, $\vec{v}$, and $\vec{w}$.

$$
\text{Volume} = \text{Base Area} \times \text{Height}
$$

* **Base Area:** The magnitude of the cross product, $\|\vec{v} \times \vec{w}\|$, represents the area of the parallelogram formed by $\vec{v}$ and $\vec{w}$.
* **Height:** The projection of vector $\vec{r}$ onto the normal vector $\vec{n}$.

## The Plane Equation
It follows that if the determinant is zero, the volume is zero.

$$
\begin{vmatrix} x & v_1 & w_1 \\ y & v_2 & w_2 \\ z & v_3 & w_3 \end{vmatrix} = 0
$$

**Geometric Conclusion:**
If the volume is 0, the "height" is 0. This means the vector $\vec{r} = (x, y, z)$ lies flat in the same plane spanned by $\vec{v}$ and $\vec{w}$.

Thus, this equation defines the **plane passing through the origin** spanned by vectors $\vec{v}$ and $\vec{w}$.


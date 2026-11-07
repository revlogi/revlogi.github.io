---
title: "Writing Some CPS in Haskell - Appendix: The Monad Hidden in CPS"
description: "Exploring Continuation-Passing Style in Haskell through recursive warm-ups, merge sort, and a small interpreter"
publishDate: "4 November 2026"
tag: computation
draft: true
---

In the previous post, we went through several examples of turning standard recursive functions into CPS. Along the way, we factored out this helper to keep our code more maintainable:

```haskell
liftCps2 :: (a -> b -> c) -> ((a -> r) -> r) -> ((b -> r) -> r) -> (c -> r) -> r
liftCps2 combine left right k =
  left $ \a ->
    right $ \b ->
      k (combine a b)
```

That left us with a lingering question: how do we extend it to combine any number of arguments. In this post, let's see how far we can push this idea. Think of this as a side quest from our main story, but it will give us a much deeper understanding of what CPS really is. Let's dive in!

## Extending `listCps2`

To get to n arguments, let's first see how to implement `liftCps3`:

```haskell
liftCps3
	:: (a -> b -> c -> d)
	-> ((a -> r) -> r)
	-> ((b -> r) -> r)
	-> ((c -> r) -> r)
	-> ((b -> r) -> r)
	-> (c -> r) -> r
liftCps3 combine c1 c2 c3 k =
	c1 $ \a ->
		c2 $ \b ->
			c3 $ \c ->
				k (combine c1 c2 c3)
```

However, we can notice that there are two pain points in here:

1. The type signature is an eyesore: `(a -> r) -> r` is so verbose and repeated everywhere.
2. We can't write a single `liftCpsN` fuction this way. (you want to manually define `liftCps4`, `liftCps5`...?)

## Abstraction? Abstraction!

Before moving into the N-argument problem, maybe we could clean up that noisy type by giving it a name:

```haskell
newtype Cont r a = Cont {
	runCont :: (a -> r) -> r
}
```

Now rewrite `liftCps2`'s type signature using `Cps r`:

```haskell
liftCps2 :: (a -> b -> c) -> Cps r a -> Cps r b -> Cps r c
```

That's amazing! By giving it a new name, we shift our perspective: **`Cps r` is a computation (or "context box") that contain a value `a`**

What does this look like? If you are familiar with applicative functor, maybe you've found out it earlier. We can take `lifeA2` as an example:

```haskell
lifeA2 :: (Applicative f) => (a -> b -> c) -> f a -> f b -> f c
```

Yes, it is an `Applicative function`! We can write it more formally:

```haskell
instance Applicative (Cont r) where
	pure x = Cont (\k -> k x)
	Cont m <*> Cont n =
		Cont $ \k ->
			m $ \f ->
				n $ \x
					-> k $ f x
```

It is also a `Monad`:

```haskell
instance Monad (Cont r) where
	return x = Cont (\k -> k x)
	Cont m >>= f =
		Cont $ \k ->
			m $ \a ->
				runCont (f a) k
```

You can try prove that they meet the axioms of applicative functor and monad. (It's not easy!)

## Side Note on Applicative Functor and Monad



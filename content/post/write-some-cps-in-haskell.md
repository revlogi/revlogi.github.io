---
title: "Write Some CPS in Haskell - Part 1"
description: "Exploring Continuation-Passing Style in Haskell through recursive warm-ups, merge sort, and a small interpreter"
publishDate: "2 November 2026"
tag: computation
---

Recently, I learnt about Continuation-Passing Style (CPS) which I find really fascinating. I came across [this worksheet](https://www.cs.toronto.edu/~lczhang/324/ex/ex10.pdf), and it turned out to be a great practice for writing CPS in Haskell.

So, what is CPS? In short, it packs the remaining computation of a recursive function into a closure and passes it along. You can find a more detailed explanation in Chapter 8 of [The Little Schemer](https://felleisen.org/matthias/BTLS-index.html) and this [blog post](https://deathking.github.io/2021/10/11/the-after-reading-of-the-little-schemer/) is also a great additional resource.

OK, let's try to tackle these problems.

## A Few Warm-ups

Here are four classic recursive functions:

```haskell
factorial :: Int -> Int
factorial 0 = 1
factorial n = n * Factorial (n - 1)

fibonacci :: Int -> Int
fibonacci 0 = 0
fibonacci 1 = 1
fibonacci n = Fibonacci (n - 1) + Fibonacci (n - 2)


length :: [a] -> Int
length [] = 0
length (x : xs) = 1 + Length xs

map :: (a -> b) -> [a] -> [b]
map f [] = []
map f (x : xs) = f x : Map f xs
```

It's not hard to transform them into CPS functions. For `factorial`, we simply put the multiplication into a closure and pass it along:

```haskell
cpsFactorial :: Int -> (Int -> r) -> r
cpsFactorial 0 k = k 1
cpsFactorial n k = cpsFactorial (n - 1) (\a -> k (n * a))
```

We can also use `$` to get rid of the parentheses and make it cleaner:

```haskell
cpsFactorial :: Int -> (Int -> r) -> r
cpsFactorial 0 k = k 1
cpsFactorial n k =
	cpsFactorial (n - 1) $ \a
		-> k $ n * a
```

The same goes for the `length` and `map` function:

```haskell
cpsLength :: [a] -> (Int -> r) -> r
cpsLength [] k = k 0
cpsLength (x : xs) k = cpsLength xs (\a -> k (1 + a))

cpsMap :: (a -> b) -> [a] -> ([b] -> r) -> r
cpsMap f [] k = k []
cpsMap f (x : xs) k =
	cpsMap f xs $ \a ->
		k $ f x : a
```

However, the `fibonacci` function is a little bit trickier. It makes a recursive call not just once, but twice, so we need to chain two continuations together. Take a moment to trace how this works:

```haskell
cpsFibonacci :: Int -> (Int -> r) -> r
cpsFibonacci 0 k = k 0
cpsFibonacci 1 k = k 1
cpsFibonacci n k =
	cpsFibonacci (n - 1) $ \a ->
		cpsFibonacci (n - 2) $ \b ->
			k $ a + b
```

## A Real Challenge

Next up, let's try to transform `mergeSort` into CPS.

```haskell
mergeSort :: [Int] -> [Int]
split :: [Int] -> ([Int], [Int])
merge :: ([Int], [Int]) -> [Int]
```

To get you started, here are the type signatures for the standard implementation. Feel free to try implement them on your own first.

Here's my solution:

```haskell
mergeSort :: [Int] -> [Int]
mergeSort [] = []
mergeSort [a] = [a]
mergeSort ls =
	merge (mergeSort left, mergeSort right)
		where (left, right) = split ls

split :: [Int] -> ([Int], [Int])
split [] = ([], [])
split [a]  = ([a], [])
split (x : y : ys) =
	((x : left), (y : right))
		where (left, right) = split ys

merge :: ([Int], [Int]) -> [Int]
merge (xs, []) = xs
merge ([], ys) = ys
merge ((x : xs), (y : ys))
	| x < y = x : merge (xs, (y : ys))
	| otherwise = y : merge ((x : xs), ys)
```

To turn `mergeSort` into CPS, we first need to turn `merge` and `split` into CPS.

```haskell
-- | CPS transform of split
cpsSplit :: [Int] -> (([Int], [Int]) -> r) -> r
cpsSplit [] k = k ([], [])
cpsSplit [x] k = k ([x], [])
cpsSplit (x : y : ys) k =
  cpsSplit ys $ \(left, right) ->
    k ((x : left), (y : right))

-- | CPS transform of merge
cpsMerge :: [Int] -> [Int] -> ([Int] -> r) -> r
cpsMerge [] bs k = k bs
cpsMerge as [] k = k as
cpsMerge (x : xs) (y : ys) k
  | x < y = cpsMerge xs (y : ys) (\a -> k $ x : a)
  | otherwise = cpsMerge (x : xs) ys (\a -> k $ y : a)
```

Not too hard, right?

Now, how do we combine them to build the `mergeSort`? The base cases are easy:

```haskell
cpsMergeSort :: [Int] -> ([Int] -> r) -> r
cpsMergeSort [] k = k []
cpsMergeSort [a] k = k [a]
```

But how do we write the recursive case? A great way to think about it is to treat it like a data pipeline:

```haskell
cpsMergeSort ls k =
	cpsSplit ls $ \(left, right) ->
		cpsMergeSort left $ \a ->
			cpsMergeSort right $ \b ->
				cpsMerge a b k
```

It explicitly shows how the data flows step by step: `cpsSplit` splits the list into left and right -> `cpsMergeSort` sorts left and right into a and b -> `cpsMerge` merge these two result into the final sorted piece. In some sense, the CPS makes the data flow of the function much clearer.

## A CPS Interpreter

The main quest here is to implement an interpreter (`eval`) for a small toy language called `Bork`.

Before looking at `eval`, let's quickly go over its core data types:

```haskell
-- | An environment is a mapping of names to values
type Env = Map.Map String Value
emptyEnv = Map.empty

-- | Values in Bork include:
data Value = Nil | T | F            -- null values and booleans
           | Num Int                -- integers
           | Procedure HaskellProc  -- procedures (closures), see below
           | Error String           -- errors
          deriving (Eq, Show)

-- | Bork procedures are represented using Haskell functions.
data HaskellProc = Proc ([Value] -> Value)
instance Show HaskellProc where
    show x = "[Can't Show Procedure]"
instance Eq HaskellProc where
    x == y = False

-- | Expressions in Bork include:
data Expr = Literal Value           -- literal values
          | Plus Expr Expr          -- builtin "plus" function
          | Times Expr Expr         -- builtin "times" function
          | Equal Expr Expr         -- builtin checks for equality
          | Var String              -- variable names
          | If Expr Expr Expr       -- if statements
          | Lambda [String] Expr    -- function definitions
          | App Expr [Expr]         -- function applications
          deriving (Eq, Show)
```

- `Env` is simply a dictionary that binds variable names to their values.
- `Value` represents the result of evaluating an expression.
- `Expr` is the AST of the language, supporting literals, basic arithmetic, equality checks, variable lookups, `If` expressions, and multi-argument functions.

With these types in place, the standard interpreter looks like this:

```haskell
-- | The interpreter `eval` for Bork, which takes an environment
--   and an expression, and returns the evaluated value.
eval :: Env -> Expr -> Value
eval env (Literal v) = v
eval env (Plus a b)  = case ((eval env a), (eval env b)) of
    (Num x, Num y) -> Num (x + y)
    _              -> Error "plus"
eval env (Times a b) = case ((eval env a), (eval env b)) of
    (Num x, Num y) -> Num (x * y)
    (c, d)         -> Error "times"
eval env (Equal a b) = if (eval env a) == (eval env b) then T else F
eval env (Var name)  = case (Map.lookup name env) of
    Just a  -> a
    Nothing -> Error "lookup"
eval env (If cond expr alt) = if (eval env cond) == T
    then (eval env expr)
    else (eval env alt)
eval env (Lambda params body) = Procedure $ Proc $ \vargs ->
    let newEnv = Map.union (Map.fromList (zip params vargs)) env
    in eval newEnv body
eval env (App proc args) = let procval = (eval env proc)
    in case procval of
        Procedure (Proc f) ->  let vargs = (map (eval env) args)
                               in f vargs
        _                  -> Error (show args)
```

OK, let's turn it into CPS. First off, we need the type signature for `cpsEval`:

```haskell
cpsEval :: Env -> Expr -> (Value -> Value) -> Value
```

Why isn't it `(Value -> r) -> r` like in the previous sections? Because in an interpreter, we sometimes want to manipulate or replace the continuation itself. We will see how this is used in the next post.

Let's start with the basics. The `Literal` and `Var` cases are just like base cases. We can implement them easily:

```haskell
cpsEval env (Literal value) k = k value
cpsEval env (Var name) k = case (Map.lookup name env) of
  Just a -> k a
  Nothing -> k $ Error "lookup"
```

What about arithmetics and comparisons? It's just like the fibonacci function we implemented earlier:

```haskell
cpsEval env (Plus a b) k =
	cpsEval env a $ \aval ->
		cpsEval env b $ \bval ->
			case (aval, bval) of
				(Num x, Num y) -> k $ Num (x + y)
				_ -> k $ Error "plus"
cpsEval env (Times a b) k =
	cpsEval env a $ \aval ->
		cpsEval env b $ \bval ->
			case (aval, bval) of
				(Num x, Num y) -> k $ Num (x * y)
				_ -> k $ Error "times"
cpsEval env (Equal a b) k =
	cpsEval env a $ \aval ->
		cpsEval env b $ \bval ->
				if (aval == bval) then k T else k F
```

Wait, do you see the repetitive pattern across these three cases? Maybe we can factor it out:

```haskell
liftCps2 :: (a -> b -> c) -> ((a -> r) -> r) -> ((b -> r) -> r) -> (c -> r) -> r
liftCps2 combine left right k =
  left $ \a ->
    right $ \b ->
      k (combine a b)
```

Now we can use this helper function to refactor the above cases:

```haskell
cpsEval env (Plus a b) k =
  liftCps2 addValues (cpsEval env a) (cpsEval env b) k
  where
    addValues (Num x) (Num y) = Num (x + y)
    addValues _ _ = Error "plus"
cpsEval env (Times a b) k =
  liftCps2 timeValues (cpsEval env a) (cpsEval env b) k
  where
    timeValues (Num x) (Num y) = Num (x * y)
    timeValues _ _ = Error "times"
cpsEval env (Equal a b) k =
  liftCps2 testEqual (cpsEval env a) (cpsEval env b) k
  where
    testEqual a b = if (a == b) then T else F
```

We can even use it to rewrite cpsFibonacci:

```haskell
cpsFibonacci :: Int -> (Int -> r) -> r
cpsFibonacci 0 k = k 0
cpsFibonacci 1 k = k 1
cpsFibonacci n k =
  liftCps2
    (+)
    (cpsFibonacci (n - 1))
    (cpsFibonacci (n - 2))
    k
```

Pretty neat, right?

> Maybe `liftCps2` can be extended to conbine n params and becomes `liftCpsN`. But how to do that?

The `If` case is also straitforward. We just pass the `cond` we evaluated first into the continuation and pick the right branch to evaluate next:

```haskell
cpsEval env (If cond expr alt) k =
  cpsEval env cond $ \cond' ->
    if (cond' == T) then (cpsEval env expr k) else (cpsEval env alt k)
```

For `Lambda`, we need to pack it into a procedure and bind the parameters:

```haskell
cpsEval env (Lambda params body) k =
  k
    $ Procedure
    $ Proc
      ( \values k2 ->
          let newEnv = Map.union (Map.fromList (zip params values)) env
           in cpsEval newEnv body k2
      )
```

Wait, what the hell is k2? Actually, it comes from the `Proc`. Let's take a close look at how `HaskellProc` is defined in this CPS version:

```haskell
data HaskellProc = Proc ([Value] -> (Value -> Value) -> Value)
instance Show HaskellProc where
    show x = "[Can't Show Procedure]"
instance Eq HaskellProc where
    x == y = False
```

Earlier, a procedure in `Bork` was a normal function `[Value] -> Value`. To convert the interpreter to CPS, procedures in `Bork` must also take a continuation. So `Proc` needs both values and a new continuation, which explains why we have k2 here.

Lastly, we have the function application case. Let's look at the standard version first:

```haskell
eval env (App proc args) = let procval = (eval env proc)
    in case procval of
        Procedure (Proc f) ->  let vargs = (map (eval env) args)
                               in f vargs
        _                  -> Error (show args)
```

All we need to do is transform the `eval` calls in the function body into CPS.

```haskell
cpsEval env (App proc args) k =
  cpsEval env proc $ \procval ->
    case procval of
			...
```

Wait, how do we handle the `map`? Maybe we need another helper function to evaluate the argument list in CPS:

```haskell
cpsEvalArgs :: Env -> [Expr] -> ([Value] -> Value) -> Value
cpsEvalArgs env [] k = k []
cpsEvalArgs env (x : xs) k =
  cpsEval env x $ \v ->
    cpsEvalArgs env xs $ \vs ->
      k (v : vs)
```

OK, now we can complete the `cpsEval` easily.

```haskell
cpsEval env (App proc args) k =
  cpsEval env proc $ \procval ->
    case procval of
      Procedure (Proc f) -> cpsEvalArgs env args $ \vargs ->
        f vargs k
      _ -> k $ Error (show args)
```

## Coming Next

In this post, we went from transforming simple recursive functions like `factorial` and `fibonacci` to viewing CPS as data pipeline in `mergeSort`, and finally to converting a full interpreter into CPS.

Still, one big question remains: **why bother writing an interpreter in CPS?** Right now, we are just dutifully passing `k` from one step to the next.

However, we can actually manipulate `k` itself and use it to implement lots of magical features. Stay tuned for Part 2!

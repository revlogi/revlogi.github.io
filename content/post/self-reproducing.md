---
title: "Self-reproducing Program"
description: "quine"
publishDate: "23 June 2026"
---

How to write a program that reproduces itself? This is fundamentally a self-reference problem, formalized in computer science by the concept of a [quine](<https://en.wikipedia.org/wiki/Quine_(computing)>). A formal definition of this problem is as follows: A **quine** is a computer program that takes no input and produces a copy of its own source code as its only output.

So how can we tackle this problem? To illustrate this better, I wrote a simple language [ouro](https://github.com/revlogi/ouro). It only contains the necessary features to implement quine and is simple to understand and I will go through its features as we attempt to solve it.

## First Attempt

Now let's try to self-reproduce ourselves. Suppose we have some contents like s:

```
let s = "some content" \\ This creates a local variable
```

and we want the program to reproduce itself, so we can print this. In ouro, we can concatenate printed stuff using +:

```
let s = "some content"
print("let s = " + s)
```

This program will print:

```
let s = "some content"
```

Seems like it prints itself, but there's one missing piece: the print statement itself.

Although we can add another print statement to print the former print statement, there's always one missing print statement because the print statement only deals with stuff before it.

## Second attempt

Ouro has a native memory system that allow you to manipulate the memory that stores the source code. It has mem list which contains memory like this:

```
-----------
|  source  |
|   code   |
-----------
|  local   |
| variables| <=
-----------
```

It also has a built-in variable called `__code_len__` which stores the length of the source code and it can output using `putchar()`.

These features grant us power to do something interesting, like producing the capital version of the source code:

```
let i = 0
let c = 0
while i < __code_len__ {
    c = mem[i]
    if c >= 97 {
        if c <= 122 {
	        mem[i] = c - 32
	    }
    }
    i = i + 1
}
let j = 0
while j < __code_len__ {
    putchar(mem[j])
    j = j + 1
}
```

Which will output:

```
LET I = 0
LET C = 0
WHILE I < __CODE_LEN__ {
    C = MEM[I]
    IF C >= 97 {
        IF C <= 122 {
	        MEM[I] = C - 32
	    }
    }
    I = I + 1
}
LET J = 0
WHILE J < __CODE_LEN__ {
    PUTCHAR(MEM[J])
    J = J + 1
}
```

Also, it means we can produce the source code:

```
let i = 0
while i < __code_len__ {
  putchar(mem[i])
  i = i + 1
}
```

This is basically Von Neumann's solution to self-reproducing problem. The key idea here is to use the same information stored in two ways: first as instructions to be executed, and second as data to be used by those instructions.

It's also quite similar to self-replication in DNA and they all require an interpreter (In DNA scenario, it is the messenger RNA, transfer RNA, ribosomes...) to execute them.

However, this actually doesn't solve quine. A true quine explicitly demands that the program to **take no input** and using memory as input is generally considered cheating.

SO, what is the right approach?

## Third Attempt

We can draw some inspiration from the second attempt. To really accomplish this, we need to find a way to let the last statement have a method to reference itself.

```
let s = "some content"
print("let s = " + s + "\n" + ??)
```

What can we put into this ??

What if we let s to be the self-reference anchor (don't forget escaping):

```
let s = "print(\"let s = \" + s + \"\\n\" + s)"
print("let s = " + s + "\n" + s)
```

This will output:

```
let s = print("let s = " + s + "\n" + s)
print("let s = " + s + "\n" + s)
```

Seems correct now. However, if you used `diff` to check, you will find there're still some small issues:

```
1c1
< let s = "print(\"let s = \" + s + \"\\n\" + s)"
---
> let s = print("let s = " + s + "\n" + s)
```

Ouro has powerful tool to deal with this, which is repr(). It is similar to the `repr()` in Python but not the same. The function of it is to output a string as what it is without any escape.

For example:

```
let s = "\\"
print(s)
print(repr(s))
```

will output:

```
\
"\\"
```

We can write the ultimate quine program:

```
let s = "print(\"let s = \" + repr(s) + \"\\n\" + s)"
print("let s = " + repr(s) + "\n" + s)
```

which will output:

```
let s = "print(\"let s = \" + repr(s) + \"\\n\" + s)"
print("let s = " + repr(s) + "\n" + s)
```

and there's no difference at all.

A true quine forces you to confront self-reference directly — there's no input, no cheating, just the program and itself.

---
layout: post
title:  "Gready algorithms"
date:   2020-05-08 17:30:00 +0200
date_friendly: 8 травня 2020 р. 
categories: [Programming, Algorithms]
tags: [algorithms, codility.com]
---

![Cover](/assets/img/posts/2020-05-08-greedy-algorithms/Cover.png) 

Greedy algorithm is an intuitive and efficient way to solve optimization problems. And although its implementation attracts with its obviousness, it is not always optimal. You need to understand precisely when to use a greedy approach and when to avoid it. In the article I suggest to look into greedy algorithms and try to apply it to problems from the [codility.com](http://codility.com) site.

## Greedy approach

Greedy algorithms are a whole family of algorithms (sometimes referred to as greedy approach or greedy programming), so there is no specific greedy algorithm that can be implemented in code. However, all greedy algorithms are built on one principle - to choose the optimal solution at each step, regardless of the steps that were done before or will be done after. In other words, the *greedy algorithm makes a locally optimal choice in the hope that it will lead to a globally optimal solution*.

## Coins problem

Consider a popular example with coins. Suppose we have coins of 1, 2 and 5 cents and we need to deduct 10 cents so that the number of coins is minimal.

![](/assets/img/posts/2020-05-08-greedy-algorithms/CoinsWhiteBackground.png)

According to the greedy approach we need to choose the coin with the highest denomination at each step and this will lead to a minimum number of them as a result. Let's take 5 cents, now we can take another 5 cents coin without exceeding the limit of 10. As a result, 10 = 5 + 5. The number of coins is 2 and this is, indeed, the minimum possible number of them under these conditions.

But if you add a coin of 6 cents to the task condition, it will make the application of the greedy approach not optimal. Indeed, in the first step we need to choose 6 as the coin with the highest denomination, but then we can not choose either 6 or 5, as this will exceed the limit of 10 cents. There are two coins of 2 cents. As a result, we have 10 as the sum of 6 + 2 + 2. While the optimal solution will be all the same 2 coins of 5.

Depending on the problem we are solving, the greedy method may or may not be optimal. If it does not give an optimal solution, often, it allows you to find a solution close to optimal. In this case, you need to use another approach, such as the full search or the dynamic programming. However, if the greedy approach still works correctly, the execution time of the algorithm will be much less than the execution time of the full search or dynamic programming.

## Pros and Cons

1. **Greedy approach is easy to understand and implement in code.** At each step of the algorithm we can abstract from the previous and next steps and think only about the optimal solution at this stage. The greedy approach does not imply the cancellation of the choice already made (return to previous steps) and does not predict anything for the future.

2. **The speed of the program with a greedy approach is easy to predict**, because the complexity of the algorithm is obvious. Most often, it is linear, that is, the execution time of the program linearly depends on the amount of input data. With other algorithmic approaches, such as Divide and Conquer, this is not always the case.

3. But the approach has a big drawback. **In most cases, the greedy algorithm does not work properly.** You need to understand very well when you can apply it and when you can't. And even if the greedy algorithm gives the optimal solution in certain cases, it is difficult to prove that the approach will work in all other possible cases.

In the example with coins, the greedy algorithm works well for coins with denominations of 1, 2, 5, but no longer works for denominations of 1, 2, 5, 6. It should be noted that all monetary systems known to me are designed so that the greedy algorithm works for them correctly. Because it is simple and fast, people can easily find the right amount of money to pay at the supermarket. 

## Rules for applying
There is a heuristic rule for understanding the applicability of the greedy approach. If both of the following properties hold, the greedy algorithm can be applied to solve the problem.

1. **The principle of greedy choice**. The sequence of optimal choices at each step leads to the optimal solution in the end.
2. **Optimal substructure**. A problem has an optimal substructure if the optimal solution of the whole problem contains the optimal solution for any subtask. In other words, after completing a certain step of the algorithm, it remains to solve the problem for which the greedy approach also works.

Let's try to apply these rules on an example **Knapsack problem**.

The thief broke into the warehouse, where there are three goods.

| Good   | Price   | Weight|
|--------|---------|------:|
| Good A | 60 USD  | 10 kg |
| Good B | 100 USD | 20 kg |
| Good C | 120 USD | 30 kg |

But the thief has a knapsack of only 50 kg. How should he decide what to take to maximize his profits?

It is not difficult to see that the best solution would be to take goods B and C, which will give a total of 220 USD. But if the thief took a greedy approach, he would begin to choose the goods with the highest value (the ratio of price to weight). The most expensive product is A, because it costs 6 USD/ kg, while B and C cost 5 and 4 USD/ kg, respectively. That is, a greedy thief would choose goods A and B as the most expensive and thus would be able to take with him only 160 USD, as product C would no longer fit in the knapsack.

Let's return to the rule. The choice of the first product A contradicts the principle of greedy selection, because it does not lead to the optimal solution, which is B + C. Thus, the greedy algorithm can not be applied in the general case to the Knapsack Problem.

> There is a formal proof of the possibility or impossibility of using a greedy algorithm. To do this, we must turn to theory [Matroid](https://en.wikipedia.org/wiki/Matroid).
If we prove that the set of possible solutions is a matroid, according to [Rado-Edmonds theorem](https://link.springer.com/article/10.1007/BF01584082), the greedy approach can be successfully applied.

## Practical use
Greedy algorithms have many applications. One of the most famous is [Dijkstra's algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) to find the shortest path in the graph.

The algorithm works with unvisited nodes and calculates the approximate distance from one node to another. If the algorithm finds a shorter way to get to a given node, the path is updated to take into account the shorter distance. This problem has an optimal substructure, because if node A is connected to B and B is connected to C, and the path must pass through A and B to get to destination C, then the shortest path from A to B and the shortest the path from B to C should be part of the shortest path from A to C. Thus, the optimal solution of the subtask leads to the optimal solution as a whole.

![Illustration](https://upload.wikimedia.org/wikipedia/commons/5/57/Dijkstra_Animation.gif)

[Huffman coding](https://en.wikipedia.org/wiki/Huffman_coding) is another well-known example of the successful application of the greedy approach. Huffman's algorithm analyzes some text and assigns each character a code of variable length based on the frequency with which this character occurs int the input text. The most common characters will have shorter codes, the rare characters will have long codes. This can significantly reduce (sometimes up to 80%) the amount of data needed to transmit or store text.

**The scheduling problem** can also be solved greedily. Imagine we have a number of tasks and each has a specific deadline and reward. Each task takes a fixed amount of time. The reward will be paid if the task is completed by the deadline. You need to choose a to-do list to maximize your profits.

As you can see, the greedy approach can be used in real problems in various fields, such as scheduling, finding the optimal path, coding symbols, and others.

## Problem from Codility.com

The site [codility.com](http://codility.com) has a lot of materials on algorithms and tasks that will help consolidate knowledge what is good for us.

Let's solve the problem of non-intersecting segments from the lesson on greedy algorithms - [MaxNonoverlappingSegments](https://app.codility.com/programmers/lessons/16-greedy_algorithms/max_nonoverlapping_segments/).

So, on the coordinate axis there are segments defined by two arrays A and B. Array A contains the coordinates of the beginnings, and B - the coordinates of the ends of the segments. That is, segment number 1 begins at point A [1] and ends at point B [1].

Consider the following example.

```
A[0]=1 B[0]=5
A[1]=3 B[1]=6
A[2]=7 B[2]=8
A[3]=9 B[3]=9
A[4]=9 B[4]=10
```
The segments are shown in the figure below.

![Illustration](/assets/img/posts/2020-05-08-greedy-algorithms/TaskIllustration1.png)

You need to find the maximum number of segments that do not intersect. Intersected are those segments that have at least one point in common.

For the example above, the maximum number of non-intersecting segments is 3. Possible options: `{0, 2, 3}`, `{0, 2, 4}`, `{1, 2, 3}` or `{1 , 2, 4} `. If you take any 4 segments, then at least two of them will intersect for sure.

> The problem contains an additional condition that affects its solution - the segments are sorted by the end coordinate. In other words, array B is sorted in ascending order.

Let's start by creating a **xunit** project in C#.

```powershell
> dotnet new xunit -n MaxNonoverlappingSegments
The template "xUnit Test Project" was created successfully.
```
I chose the project with unit tests, as we will try to write the test first and only then the implementation of the algorithm.

Copy the class blank from the site and create your own class with the test.
```c#
class Solution
{
    public int solution(int[] A, int[] B)
    {
        throw new NotImplementedException();
    }
}

public class UnitTest1
{
    [Theory]
    [InlineData(
        new int[] { }, 
        new int[] { }, 
        0)]
    public void Test(int[] a, int[] b, int result) 
    {
        Assert.Equal(result, new Solution().solution(a, b));
    }
}
```

Test data is specified through the `InlineData` attribute. In this case, 0 non-intersecting segments are expected for an empty list.

Let's run a test. It ended with an error `NotImplementedException`, because the class `Solution` is not implemented. Let's just return the total number of segments in the first stage. It should work.

```c#
public int solution(int[] A, int[] B)
{
    return A.Length;
}
```

Now the test is successful.

We will also add a test for one segment and for two segments that do not intersect.

```c#
[InlineData(
    new int[] { 1 }, 
    new int[] { 1 }, 
    1)]
[InlineData(
    new int[] { 1, 2 }, 
    new int[] { 1, 3 }, 
    2)]
```

Our code still satisfies these tests!

But for the case of two intersecting segments (`[1, 2], [2, 3]`), the algorithm doesn't work.
```
MaxNonoverlappingSegments.UnitTest1.Test(a: [1, 2], b: [2, 3], result: 1) [FAIL]
[xUnit.net 00:00:00.63]       Assert.Equal() Failure
[xUnit.net 00:00:00.63]       Expected: 1
[xUnit.net 00:00:00.63]       Actual:   2
```

Now it's time to implement a greedy algorithm for selecting segments. The idea that first comes to mind: moving from right to left to select the first available segment and memorize it. If the next segment intersects with the current, skip it, if it does not intersect, then increase the counter of segments. Then you need to remember the next segment as the current one and move on.

> This algorithm can be applied, because the segments are sorted by the end coordinate.

In the code it can be expressed as follows:

```c#
public int solution(int[] A, int[] B)
{
    var result = 0;
    var N = A.Length;
    var position = int.MaxValue;

    for (int i = N - 1; i >= 0; i--)
    {
        if (B[i] < position)
        {
            result++;
            position = A[i];
        }
    }

    return result;
}
```

To be precise, the current segment is not remembered here, but only the coordinate of its beginning (the `position` variable), because this is enough to check whether the next segment can be included in the solution. If the coordinate of the end of the current segment is less than `position`, it is added to the result and `position` changes to its beginning.

Great, now all the tests have been passed! We will add another case described on the site:

```c#
[InlineData(
    new int[] { 1, 3, 7, 9, 9 }, 
    new int[] { 5, 6, 8, 9, 10 }, 
    3)]
```

It also completes successfully, but do not rush to send the result for verification. Our algorithm allows to reduce the intervals between segments, but it does not take into account the length of the segments. If the first segment that comes to hand will occupy the entire coordinate axis, the algorithm will ignore all other segments. And among them there may be several that do not intersect with each other. Therefore, our algorithm is clearly NOT optimal. This test describes the following case:

```c#
[InlineData(
    new int[] { 1, 3, 1 }, 
    new int[] { 2, 4, 5 }, 
    3)]
```
![Iluustration](/assets/img/posts/2020-05-08-greedy-algorithms/TaskIllustration2.png)

There are three segments. Segment 1-5 is the longest one and it overlaps all other segments. Since its end is farthest, with a greedy approach, it will be chosen first and will not allow to include other segments in the solution. Instead of the correct result **2** (segments 1-2, 3-4) we get the result **1** (segment 1-5).

If we sort the segments by the coordinate of the beginning and try to go from beginning to end, we get the same problem, but on the other hand. Therefore, this is not an option.

We need to change the optimality function that is applied at each step. If we come across a segment that is shorter than the current one and still completely overlaps with it, we need to change the current segment to a shorter one. In this way we minimize the length of the segments and maximize their number.

```c#
public int solution(int[] A, int[] B)
{
    var result = 0;
    var N = A.Length;
    var position = int.MaxValue;

    for (int i = N - 1; i >= 0; i--)
    {
        if (B[i] < position)
        {
            result++;
            position = A[i];
            continue;
        }

        if (A[i] > position)
        {
            position = A[i];
            continue;
        }
    }

    return result;
}
```

The first part of the algorithm remains unchanged: if we come across a segment that can be included in the solution, we increment the `result` and move on to the next segment.

If we come across a segment that completely overlaps with the current one (`if (A[i] > position)`), we will replace the current segment with a shorter one.

```
Total tests: 6. Passed: 6. Failed: 0. Skipped: 0
```

All tests were completed successfully. Now we can send this code for verification.

![Task Result](/assets/img/posts/2020-05-08-greedy-algorithms/CodilityResultsDetailed.png)

As you can see, our algorithm is not only correct, it is also optimal in time. Its complexity is linear `O(n)`.

> The test examples provided by [codility.com](http://codility.com) do not always cover all cases, so even if your code works well for the proposed test data, try to analyze your solution and imagine situations in which the algorithm may not work and create such additional tests.

## Conclusion
Greedy approach is a great intuitive and effective way to solve many popular programming problems. Its biggest drawback is the need to understand well when it can be applied and when it is necessary to turn to another approach. But even in situations where a greedy algorithm does not give an optimal solution, its result can be close to optimal and it will definitely be more effective than the method of full search or dynamic programming.
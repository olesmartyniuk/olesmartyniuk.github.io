---
layout: post
title:  "LINQ. Overview"
i18n-link: linq-overview
date:   2020-05-01 17:35:30 +0200
date_friendly: 1 May 2020 
categories: Programming, dotNET]
tags: [c#, linq]
---
![Illustration](/assets/img/posts/2020-05-01-linq-overview/Cover.png)

In this article, I propose to consider LINQ as an important component of the .NET framework, its history and role. Why it was created and how to use this tool in the end. Finally, let's look at examples in C # that give an idea of ​​what LINQ is.

**LINQ** - (*анг. language integrated query*) - a language of queries to structured data, which is integrated into C #. Such structured data can be collections of objects in memory, XML files, database tables, web services, etc. But why do we need another tool in C # that allows us to work with data anyway? It's all about ease of understanding and perception. In order to explain what the ease of LINQ is, it is necessary to consider the difference between declarative and imperative programming.

## Imperative and declarative programming
The first programming languages ​​set a clear order of commands. This is very handy when dealing with CPU registers and direct memory access. Languages ​​such as C and Assembler use memory allocation operators, assignments, conditional operators, and routines. All these are signs of an imperative approach. The word imperative is translated from English as an order and it is quite an accurate meaning for such an approach, because in the imperative approach the program is a sequence of clear commands and the computer executes these commands one by one.

Imperative programming languages ​​include:
* C#
* Python
* JavaScript
* Go

All of these languages ​​are based on variables, assignment operators, and routines. This approach is close to how a computer works, but far from human language, familiar to all of us. It is more convenient for a person to declare what he wants than to describe a clear algorithm for achieving this goal.

Therefore, the imperative approach is opposed to the declarative. Its main feature is that the step-by-step algorithm is not specified. Instead, the data source is specified, the desired result is described and a set of rules by which this result will be achieved. Execution of the request is entrusted to the interpreter, who is able to translate it into a form convenient for the computer, ie in the imperative form.

Declarative languages ​​include:
* SQL
* Regular Expressions
* XSLT Transformation
* Gremlin

It was the introduction of a declarative approach to data processing in .NET and was the main purpose of creating LINQ.

## Comparison of approaches

Consider two examples, first imperative using a loop and then declarative using LINQ.

As a test data set, take a list of superheroes, each with a name, year of birth (or first mention in comics) and the name of the series where he first appeared.

So, let's create a new console program in .NET Core:

``` bash
> dotnet new console -n  LinqTestApp
The template "Console Application" was created successfully.
```
Define the superhero class and add test data.

```c#
private class Hero
{
    public string Name { get; set; }
    public int YearOfBirth { get; set; }
    public string Comics { get; set; }
}

private static readonly List<Hero> _heroes = new List<Hero> 
{
    new Hero
    {
        Name = "Superman",
        YearOfBirth = 1938,
        Comics = "Action Comics"
    },
    new Hero
    {
        Name = "Batman",
        YearOfBirth = 1938,
        Comics = "Detective Comics"
    },
    new Hero
    {
        Name = "Captain America",
        YearOfBirth = 1941,
        Comics = "Captain America Comics"
    },
    new Hero
    {
        Name = "Ironman",
        YearOfBirth = 1963,
        Comics = "Tales of Suspense"
    },
    new Hero
    {
        Name = "Spiderman",
        YearOfBirth = 1963,
        Comics = "Amazing Fantasy"
    }
};
```
Suppose our task is to select those superheroes who have the word "man" in their name and display their names in alphabetical order. That is, we must get the names of all the heroes (except Captain America) in sorted form.
```
Batman
Ironman
Spiderman
Superman
```
With the imperative approach, we need to create a list in which we will enter the names of the filtered characters, then go through the list of characters and add to the created list only those whose names contain the word "man". After that it is necessary to sort the received list and to display:
```c#
static void Main(string[] args)
{
    var heroNames = new List<string>();
    foreach (var hero in _heroes)
    {
        if (hero.Name.Contains("man"))
        {
            heroNames.Add(hero.Name);
        }
    }
    heroNames.Sort();

    foreach (var heroName in heroNames)
    {
        Console.WriteLine(heroName);
    }
}
```
Now let's solve the same problem, but with LINQ.
> Don't forget to check the namespace System.Linq

```c#
using System.Linq;
...
static void Main(string[] args)
{
    var heroNames =
        from hero in _heroes
        where hero.Name.Contains("man")
        orderby hero.Name
        select hero.Name;

    foreach (var hero in heroNames)
    {
        Console.WriteLine(hero.Name);
    }
}
```

The program has become 5 lines shorter and easier to understand, because the data is sampled in a language very similar to English: From heroes where heroName contains “man” ordered by name select name , which can be translated as “Choose the names of those heroes "Man" in the name and sort them by name .

Let's understand what this code does.

from hero in _heroesspecifies the data source. We have a constant list _heroes. We will refer to each item in the list in an expression through a variable hero. And although we did not specify its type anywhere, the expression remains strictly typed, because the compiler can output the type from the collection type _heroes.

where hero.Name.Containsspecifies the condition for filtering the incoming list. If the element meets the condition, it is passed on. Thus, all subsequent operators in the expression will already work with the filtered list. The operator is wherealso called the filter operator.

orderby hero.Name specifies the field and sort method.

select hero.Namesets the value to be included in the resulting sample. Since we are only interested in the names of the characters, we specify the Name field here. It is this operator that specifies the type of result, so in our case it will be IEnumerable<string>. This operator is also called the projection operator because it converts the data containing the source into the form we need for a specific task.

## Expansion methods
It is worth noting that although the LINQ syntax is significantly different from the C # syntax, still under the hood LINQ uses C # extension methods, so the above query can be rewritten in a more familiar object style:
```c#
var heroNames = _heroes
    .Where(hero => hero.Name.Contains("man"))
    .OrderBy(hero => hero.Name)
    .Select(hero => hero.Name);
```
This syntax is called extension syntax (or lambda syntax) and can be used in conjunction with LINQ query syntax. Often when we talk about LINQ we mean extension methods because they are implemented in the namespace System.Linqand are part of LINQ as a component of .NET. For the most part, these methods extend the IEnumerable interface and are the basis for implementing LINQ. This may be confusing at first, but LINQ is not only the syntax from ... in ... select, but also the syntax of extension methods.

Because extension methods are the basis for implementing LINQ, they are more powerful than query syntax. For example, the method Wherehas an overloaded version in which the index of the item in the source collection is available when filtering. This index can be used in the formation of a logical expression (predicate).

```c#
    ...
    .Where((hero, index) => hero.Name.Contains("man") && index > 2)
```

Sorry, this index is not available if we use query syntax from ... in ... select.

Scalar functions Count, Max, Sum, and other methods (such as Intersect) are also not available when using query syntax.

Also, with extension methods, we can break a LINQ expression into several parts and form it according to a certain condition, which is impossible for query syntax. Example:

```c#
var query = _heroes.Where((hero, index) => hero.Name.Contains("man"));

if (shouldBeSorted)
    query = query.OrderBy(hero => hero.Name);

var heroNames = query
    .Select(hero => hero.Name);
```
We only add sorting if the input parameter shouldBeSortedis equal to true. Using the syntax of the query, we need to write the expression twice depending on the condition: in the first case with sorting, and in the second - without it.

> In the following review, we will use the syntax of extension methods, as it is more powerful and allows you to show the full potential of LINQ.

## A little history
In 2007, C # had version 2.0 and no LINQ. Data processing took place in an imperative style. At that time, Python 2.4 and JavaScript 1.6 already existed, which had powerful built-in tools for working with collections, such as filter, mapand reduce. C # lost a lot of convenience to them when it came to working with collections, and it couldn't last long.

In the fall of 2007, Microsoft released the .NET Framework 3.5, which featured significant innovations. These changes made it possible to create LINQ and raise the C # version to 3.0. Among the innovations were:

Lambda expressions have made it possible to easily define predicates for methods such as Where, Select as () => {...}.
Anonymous types allowed the creation of objects of arbitrary structure on the fly and removed the need to declare a type for the result of the LINQ expression.
Expression trees made it possible to store predicates as objects, on the basis of which different data providers could generate their own optimized query. This applies to LINQ to SQL or LINQ to XPath.
Expansion methods have allowed to expand existing types without modifying and imitating them. This allowed LINQ to be applied to a large number of third-party types that support IEnumerable or IQueryable.
Object and collection initializers allowed objects to be created and their fields to be initialized without the use of constructors, which greatly simplified the syntax for LINQ projection methods when creating new objects as part of an expression.
Declaring variablesvar greatly simplified the query result type determination and made it possible to return anonymous data from a LINQ expression.
All these features have taken C # and the .NET platform to a whole new level and allowed us to create LINQ. Since its release, it has become an integral part of the .NET framework and as a library for working with data is not inferior, and in many respects surpasses the built-in tools of other languages, such as Java, Python, Go and JavaScript.

In the following articles we will consider in more detail all the main aspects of working with LINQ. You will find that it is not only convenient, but also quite effective and mature tool.
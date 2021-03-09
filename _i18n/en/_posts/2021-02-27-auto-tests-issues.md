---
layout: post
published: true
title:  "7 issues in autotests from my experience"
date:   2021-02-27 14:00:00 +0200
categories: [Programming, Code quality]
tags: [unit tests, C#, integration tests, experience]
---

![Cover](/assets/img/posts/2021-02-27-auto-tests-issues/cover-en.jpg) 

In my practice I've seen projects with different approaches to testing: some were 99% covered by unit tests, while others had no tests at all. In this article, I want to highlight the typical problems with automated tests I faced during my career and how to solve them.

Every good software engineer cares about the quality of his code, so writing tests is a part of our job. We will talk about tests created by developers and problems in these tests. This applies to the system tests, integration tests as well as unit tests.

# #1. Tests depend on random data

An important property of tests is predictability. Tests should return the same result regardless of the season and room temperature. If your tests accidentally fail, you can't rely on them. There is a high risk that such tests will be temporarily disabled or completely removed.

I remember a case when some tests started falling on the first day of the month. The developer expected that there would always be at least 30 days a month. In February, his assumption did not come true.

There was also a case when the system tests expected some records in the database. Not surprisingly, the program was manually tested in the same environment, so at some point the necessary data was deleted. And since the test expected to find a record by a unique ID that was generated automatically, it was difficult to recover this data. I had to correct several dozen tests.

## What can we do?

If the tests depend on random input values you will have problems sooner or later. It is better to fix this in advance by replacing all random data with constants. Random data include:

* date and time
* dat specific for environment (environment variables, computer name, file path delimiter, etc.)
* file system
* network and databases

If you refer to external dependencies in the code, consider replacing them with wrappers that can be later replaced by stubs in unit-tests. For example, instead of using the `DateTime.Now` declare your own interface with the `Now` method, for example, `IDateTimeService.Now`. In the test, replace its implementation with the constant `new DateTime (2021, 2, 27)` and get controlled input. In real code, the `Now` method will call`DateTime.Now` and nothing will change.

Experienced developers see whether it is possible to test their code. If you care about how your code will be tested further, it means that the practice of testing has become your reliable assistant and you are using this tool correctly.

If you expect certain data to be present on external systems, consider creating that data before starting the test and deleting it after it completes.

# #2. Tests duplicate the logic of code

Suppose we have a mathematical formula that we are trying to implement in code. For example, calculating the area of ​​a triangle by its sides:

```c#
public double CalculateAreaOfTriangle (double a, double b, double c)
{
    var p = (a + b + c) / 2;
    return Math.Sqrt (p * (p - a) * (p - b) * (p - c));
}
```

When testing it, an intuitive way would be to repeat the formula in the test to not calculate the area yourself. But this is not the right approach, because a developer can make a mistake that will be duplicated in the test, especially if one developer writes both the code and the test. Besides, using complex algorithms in tests complicates their maintenance.

The better approach is to calculate the values ​​yourself and use this constant in the test. Using an exemplary implementation can also be a good approach. For example, if you have a library for geometry and it is well known and tested, you can compare the results of the function `CalculateAreaOfTriangle` with a similar function from this library.

It worth adding that I faced this kind of mistake once or twice. In most of the projects I've seen, the tests are implemented correctly: constants are used both as the input and for checking statements.

# #3. Tests are not started automatically

This error also is not very common. Sometimes developers keep tests only on their PC, or the tests are in a repository but need to be run manually. Or the tests run automatically but are triggered by a specific event: for example, the QA team leader presses a button in the web interface.

The general rule is to automatically run tests when the code changes: if unit A has changed, then all tests that verify unit A (unit tests) or verify units A, B and C as a whole (integration tests) must be started. Sometimes this procedure is simplified and all tests are run after any changes in the code. It is also valid when certain tests are run periodically at regular intervals. The results of such tests (in case of failure) should be communicated to the author of the changes (mandatory) and to all stakeholders (optional).

But hiding tests or running them manually is a bad approach. The responsible person can put it off for a few days or even weeks. All this time the failed test will wait to report a bug. And the earlier the bug is detected, the easier it's to correct.

# #4. Tests depend on other tests

When writing the system (end-to-end) tests you may want to simplify them by reusing the results obtained from previous tests.

For example, you have an internet-shop and you want to test how adding a product to your cart works. Imagine you can only add an existing product, being a registered user. So, to test the cart we need to create the user and the product, log in, and go to the page of the created product. Only here we will have access to the button that adds the product to the cart.

If you already have tests for creating a user and for adding a product, then you may want to use the results of these tests in the test for the cart. In this case, the developer creates a script in which the tests are run sequentially:

1. User registration
2. Adding goods
3. Log in to the site
4. Go to the product page
5. **Adding the product to the cart**

That is, our test depends on the data created as a result of the other 4 tests. And it's good if the documentation states what exactly data our test needs and how to create it.

You can say it's the wrong approach and nobody does like this! Because any failure in previous tests will make it impossible to check the cart. For example, if registration doesn't work we don't really know if registered users can buy in our store or not. Yes, that's right. But I have seen such tests quite often in my practice, including world-famous software products.

The developer who wrote such code may notice that it saves time running tests because for each new test you can reuse already available data and not create/delete users and products each time. If the data is stored in fairly slow databases, it can really save a lot of time.

This approach may work, but not for long. As long as there are few tests and they are done by a few people who communicate with each other and monitor the status of the tests, no problems may arise. But as soon as hundreds of tests appear and several teams start supporting them, you are guaranteed to get a mess and delays in product delivery.

## What can we do?

Try not to write automated tests that depend on each other. Such non-obvious dependencies can be costly in the future when there are many tests. Instead, you can prepare the necessary test data in the form of a script and deploy a new database before each run. Once the tests have run, this data should be deleted. 

Virtualization technologies are available today may simplify this process. It takes seconds to launch [docker](https://www.docker.com/) containers. That is, a few seconds and you have a database with data prepared for tests. Of course, you need to maintain this script. It must be a part of the repository and change as the data structure changes.

In addition, independent tests can be performed in parallel and thus run even faster than tests performed one by one in a sequence.

# #5. Tests are incomplete

When writing unit tests, usually the input data is set and the output data is checked. If we test complex classes that have many external dependencies, it is not always obvious what is the result of running the system under the test.

Imagine we have a method that deletes a file. It checks the access rights, then calls the file service and logs the result of the operation. All services used in this method are external dependencies. The functionality of these dependencies we will not test. In the test code, they will exist as mocks.

```c#
public void DeleteFile (string fileName)
{
    _permissionService.CheckPermissions (Operation.DeleteFile);
    _fileService.DeleteFile (fileName);
    _logger.LogInformation ($ "File '{fileName}' was successfully deleted.");
}
```

The input data for this method will be:

* `fileName` parameter
* success of the `CheckPermissions` method
* success of the `DeleteFile` method
* success of the method `LogInformation`

The input data for the method will be:

* the fact of calling the method `CheckPermissions` and the name of the operation for which the rights are checked
* the fact of calling the `DeleteFile` method and the name of the file to be deleted
* the fact of calling the method `LogInformation` and message logged
* how many times the above methods were called
* whether any other methods of any services were called

That is, the above code depends not only on the input parameters but also on the successful execution of all methods. We should set all the input data and check all the output when testing. Only then our test will be complete.

Mark Seamann in his article [Dependency rejection](https://blog.ploeh.dk/2017/02/02/dependency-rejection/) calls this data *indirect input and output*. But they are the same input and output data as the parameters and result. They cannot be ignored, otherwise, you cannot guarantee that the code is working properly.

I have often seen how even experienced colleagues ignored and did not check some of the output data, or missed setting some of the input data. I've heard a few excuses: *"the test should test only one thing"* and *"we don't check what's not important to the program logic"*.

I agree with the first statement, you only need to test one thing at once. But "one thing" doesn't mean one `Assert` at the end of the test. One thing is one call to the test method, or in other words, one set of input data. Checking only a fraction of the output data we do not guarantee the correctness of the logic for this case.

If a developer says he's not testing what's not important, you might ask why did he add unimportant code at all? Often developers ignore checking the logs. Program logs may not be important right now and can't be called a part of business logic. But logs definitely become important when the code doesn't work for the user. When log analysis is the only way to find a defect, they are extremely important.

> Do not confuse "incomplete tests" and "incomplete tests coverage". Incomplete tests coverage means that some parts of the code are not involved in the tests. This may be acceptable if these are unique cases, the number of possible test scenarios is too large and your team does not want to have 100% coverage.

## What can we do?

Given all this we can conclude that the test code will be more voluminous and complex than the code of the method being tested. This is often the case, especially when the class has many external dependencies. But this is the price we pay for using the dependency injection (DI) mechanism. You can simplify your life by using libraries for mocks and fakes, such as [Moq](https://github.com/Moq/moq4/wiki/Quickstart) or [NSubstitude](https://nsubstitute.github.io/). But sometimes developers still lack discipline, and then we come to the next, even bigger problem with tests.

# #6. Tests are written sloppily

By *sloppiness* I mean that the test code is written quickly, without proper quality. Some people think that test code is minor and should not be given much attention. I do not agree with that. Tests are what ensure the quality of your code. If quality is not important to you, then yes, tests are a minor thing and you should not spend effort maintaining them in proper shape. But if you decide to write tests and the quality of the product is important to you, you should keep them in the same condition as the main code. This means that the tests should be easy to read, should not contain duplicate code and in general should be approached exactly the same as the main code of your product.

I've seen situations where poorly organized tests come into the hands of a new developer, and instead of understanding and improving them, he simply commented code (this can also be done with attributes like `[Ignore]`). Then such a test may simply be forgotten and quality control will be weakened.

## What can we do?

Tests should not be taken carelessly. If it is difficult to change them apply refactoring. Just as you would do in the main code. Include time for tests (modular or integration) when planning tasks. If your manager asks you to neglect tests to speed up development, ask if he is willing to sacrifice product quality and pace of development in the future? Because code without tests is scary to change.

# #7. There are no tests at all

Maybe it sounds incredible to you? But there are still software companies that ignore the testing done by developers. Usually, they have a separate department of testers, and the responsibility for product quality rests on them. Code usually has a low quality and the product contains many defects. Tasks often roam from the developer's desktop to the tester's desktop and back. The product is released once a year and the tester's departments and the developer's department are often in a state of conflict.

Sometimes programming languages ​​or frameworks do not facilitate the possibility of unit testing. For example, Delphi or C ++ languages ​​have very limited ability in reflection, in creating fakes, mocks, and stubs. In these languages, creating tests for complex code with many dependencies can be an extremely costly process, so modular testing is avoided.

In addition, developers often don't test their code in companies where such a culture was formed due to historical reasons. Sometimes such companies were founded not by software engineers, but, for example, by accountants.

## What can we do?

We are professionals and have to worry about the result of our work. Testing ensures quality and reliability, so don't ignore it. Do not expect your QA colleague to find all the defects. This approach leads to untidy code. The ability to write good code degrades over time.

Encourage your manager to switch to other modern programming languages, and ask them to use testing frameworks that would make your job easier. If your boss does not respond, contact the company's management directly. In today's world, a product that is superficially tested has no future and can lead to reputational and material losses by the company.
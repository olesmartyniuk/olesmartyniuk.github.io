---
layout: post
title:  "Обмеження конкурентних потоків в C#"
date:   2020-05-28 19:00:00 +0200
date_friendly: 28 травня 2020 р. 
categories: [Програмування, dotNET]
tags: [dotnet, threads, parallelism, translation]
---
![](http://www.martyniuk.info/assets/img/posts/2020-05-28-constraining-concurrent-threads-in-csharp/cover.png)

> Це переклад замітки [Constraining Concurrent Threads in C#](https://markheath.net/post/constraining-concurrent-threads-csharp) Марка Хіта - Microsoft MVP, Software Architect в NICE Systems і автора кількох бібліотек з відкритим кодом.

Припустимо, в C# ми маємо виконати певну кількість задач, які наразі виконуються послідовно і які ми хочемо прискорити, запустивши їх паралельно. Для прикладу, уявіть, що ми завантажуємо купу веб сторінок: 

```c#
var urls = new [] { 
        "https://github.com/naudio/NAudio", 
        "https://twitter.com/mark_heath", 
        "https://github.com/markheath/azure-functions-links",
        "https://pluralsight.com/authors/mark-heath",
        "https://github.com/markheath/advent-of-code-js",
        "http://stackoverflow.com/users/7532/mark-heath",
        "https://mvp.microsoft.com/en-us/mvp/Mark%20%20Heath-5002551",
        "https://github.com/markheath/func-todo-backend",
        "https://github.com/markheath/typescript-tetris",
};
var client = new HttpClient();
foreach(var url in urls)
{
    var html = await client.GetStringAsync(url);
    Console.WriteLine($"retrieved {html.Length} characters from {url}");
}
```

Щоб запустити їх паралельно ми могли б запустити для кожного завантаження `Task` з `Task.Run` і очікувати поки вони всі вони завершаться. Але як бути, якщо ми хочемо **обмежити кількість одночасних завантажень**? Припустимо, ми хочемо обмежити їх до 4.

В цьому спрощеному прикладі точна кількість задач не має принципового значення, але не важко уявити ситуацію, в якій ви захочете обмежити кількість одночасних запитів до певного сервісу.

В цій замітці я хочу розглянути чотири різні способи вирішення цієї проблеми.

## Спосіб 1 - ConcurrentQueue

Перший спосіб був для мене звичним підходом протягом багатьох років. Основна ідея - поставити всі завдання в чергу і обробляти їх декількома потоками, які читають з черги послідовно. Це непоганий і доволі простий підхід, який, проте, вимагає блокування черги, так як вона буде використовуватись декількома потоками одночасно. В цьому прикладі я використовую `ConcurrentQueue`, щоб зробити це потокобезпечно. 

Ми заповнюємо чергу адресами сторінок для завантаження і запускаємо одну `Task` для кожного потоку, які в циклі намагаються читати з черги. Потоки закінчуються, коли не лишається елементів в черзі. Ми створюємо список таких задач і потім використовуємо `Task.WhenAll`, щоб дочекатись їх завершення. Вони всі завершаться, коли завершиться останнє завантаження.
```c#
var maxThreads = 4;
var q = new ConcurrentQueue<string>(urls);
var tasks = new List<Task>();
for(int n = 0; n < maxThreads; n++)
{
    tasks.Add(Task.Run(async () => {
        while(q.TryDequeue(out string url)) 
        {
            var html = await client.GetStringAsync(url);
            Console.WriteLine($"retrieved {html.Length} characters from {url}");
        }
    }));
}
await Task.WhenAll(tasks);
```

Мені досі подобається цей підхід, адже він концептуально простий. Проте, можуть бути певні незручності, якщо продовжувати додавати нові завдання після того, як ми почали їх обробку. Причина в тому, що потоки, що читають з черги, можуть завершитись зарано. 

## Спосіб 2 - SemaphoreSlim

Інший підхід (на який мене надихнула ця [відповідь зі StackOverflow](https://stackoverflow.com/questions/10806951/how-to-limit-the-amount-of-concurrent-async-i-o-operations/10810730#10810730)) - це скористатись `SemaphoreSlim` з `initialCount` рівним максимальному числу потоків. Потім ми використовуємо `WaitAsync` для очікування моменту, коли можна буде запустити наступну задачу. Таким чином, ми відразу стартуємо чотири задачі, але далі повинні дочекатись поки якась з них завершиться перед тим, як виконається `WaitAsync` і з'явиться можливість додати наступну.
```c#
var allTasks = new List<Task>();
var throttler = new SemaphoreSlim(initialCount: maxThreads);
foreach (var url in urls)
{
    await throttler.WaitAsync();
    allTasks.Add(
        Task.Run(async () =>
        {
            try
            {
                var html = await client.GetStringAsync(url);
                Console.WriteLine($"retrieved {html.Length} characters from {url}");
            }
            finally
            {
                throttler.Release();
            }
        }));
}
await Task.WhenAll(allTasks);
```

Цей код трішки наглядніший, ніж підхід з `ConcurrentQueue`. Також він призводить до ситуації, коли ми отримаємо список з потенційно великою кількістю вже завершених задач. Але цей підхід має перевагу, якщо під час виконання задач ви генеруєте нові.

Для прикладу, для передачі великого файлу до Azure Blob Storage ви можете послідовно читати порціями в 1MB, але хочете завантажувати їх по чотири одночасно. Ви не хочете читати всі порції файлу до моменту поки їх не потрібно буде відправити, так як це потребує багато часу і пам'яті. З даним підходом ми можемо створювати задачу саме в момент, коли потік звільнився і готовий завантажувати наступну порцію. Це набагато ефективніше.

## Спосіб 3 - Parallel.ForEach
Метод [`Parallel.ForEach`](https://msdn.microsoft.com/en-us/library/system.threading.tasks.parallel.foreach(v=vs.110).aspx), на перший погляд, ідеальне вирішення цієї проблеми. Ви можете просто вказати `MaxDegreeOfParallelism` і визначити `Action`, що буде виконуватись для кожного елементу у вашому `IEnumerable`:

```c#
var options = new ParallelOptions() { MaxDegreeOfParallelism = maxThreads };
Parallel.ForEach(urls, options, url =>
    {
        var html = client.GetStringAsync(url).Result;
        Console.WriteLine($"retrieved {html.Length} characters from {url}");
    });
```

Виглядає гарно і просто, чи не правда? Проте, тут є приховані граблі. Так як `Parallel.ForEach` приймає `Action`, а не `Func<T>`, його можна використовувати лише зі синхронними функціями. Ви могли помітити, що ми викрутились, додавши `.Result` після `GetStringAsync`, але це небезпечний трюк, який використовувати не рекомендується.

Тож, нажаль, цей підхід можна задіяти, якщо у вас є синхронні методи, які необхідно виконати паралельно. Існує Nuget пакет, що реалізує [асинхронну версію Parallel.ForEach](https://www.nuget.org/packages/AsyncEnumerator/1.1.0), тож ви може спробувати його, якщо бажаєте отримати щось на кшталт:

```c#
await uris.ParallelForEachAsync(
    async url =>
    {
        var html = await httpClient.GetStringAsync(url);
        Console.WriteLine($"retrieved {html.Length} characters from {url}");
    },
    maxDegreeOfParalellism: maxThreads);
```

## Спосіб 4 - політика "Перемичка" бібліотеки Polly

Останій варіант - скористатись [політикою ізоляції Перемичка (Bulkhead)](https://github.com/App-vNext/Polly/wiki/Bulkhead) бібліотеки [Polly](https://github.com/App-vNext/Polly). Ця політика обмежує кількість конкурентних викликів і, *за бажанням*, дозволяє ставити в чергу виклики, що потрапили під обмеження.

Нижче ми налаштовуємо політику Bulkhead з обмеженням на число одночасних викликів та без обмеження на кількість задач, що очікують свого запуску в черзі. Далі ми просто викликаємо метод `ExecuteAsync` в циклі, дозволяючи або негайно стартувати задачу, або поставити її в чергу, якщо задач забагато. 

```c#
var bulkhead = Policy.BulkheadAsync(maxThreads, Int32.MaxValue);
var tasks = new List<Task>();
foreach (var url in urls)
{
    var t = bulkhead.ExecuteAsync(async () =>
    {
        var html = await client.GetStringAsync(url);
        Console.WriteLine($"retrieved {html.Length} characters from {url}");
    });
    tasks.Add(t);
}
await Task.WhenAll(tasks);
```

Аналогічно до інших згаданих способів, ми зберігаємо задачі до списку і використовуємо `Task.WhenAll` для очікування їх завершення. Варто зазначити, що даний шаблон насправді створений для ситуацій, в яких конкурентні завдання генеруються з декількох потоків (для прикладу з контролерів ASP.NET). Вони можуть просто використовувати спільну політику Bulkhead і ви лише запускаєте задачу з `await bulkhead.ExecuteAsync(...)`. Тож цей підхід дуже простий і добре підходить для ситуацій, для яких він був спроєктований. 

## Висновок

Паралелізація може значно прискорити виконання вашої програми. Але, якщо вона використовується неправильно, то може сама створити більше проблем аніж розв'язує. Ці шаблони дозволяють вам використовувати обмежену кількість потоків для обробки групи задач. Єдине, з чим необхідно визначитись, - це спосіб, в який завдання створюються. Ви маєте їх з самого початку, чи вони створюються в процесі, в момент, коли вже відбувається обробка попередніх завдань? Також питання: ви генеруєте ці завдання послідовно з одного потоку чи декілька потоків мають можливість додавати задачі?

Звичайно, я впевнений, що існують інші красиві способи розв'язання цієї проблеми, тож дайте знати в коментарях, який ваш улюблений.

>
> ### Від перекладача
> В обговорення цієї замітки завітав [Стівен Клірі](https://blog.stephencleary.com/) - автор відомої книги [Concurrentcy in C# Cookbook](http://shop.oreilly.com/product/0636920266624.do?cmp=af-code-books-video-product_cj_0636920266624_7489747). Я думаю, його коментар варто перекласти також.

**Стівен Клірі**:

Я думаю, важливо розрізняти синхронну та асинхронну конкурентність. Синхронна конкурентність (паралелізм) це використання декількох потоків, і це правильний вибір, якщо ви маєте код, що інтенсивно використовує центральний процесор (CPU-bound). Асинхронна конкурентність - це форма виконання, що не вимагає додаткових потоків, і це правильний вибір, коли ви маєте код, що працює з введенням-виведенням (I/O-bound).

Наведений приклад (завантаження веб сторінок) - це введення-виведення, а отже, тут краще підходить асинхронна конкурентність. Ось чому способи з `Parallel` / `ConcurrentQueue` / `BlockingCollection` врешті виглядають незграбно: блокування потків і т.ін. Вони справді незамінні у світі синхронної конкуренції і з ними, звісно, можна ров'язати дану проблему, але цей розв'язок буде менш ефективним.

Для завантаження більше підходять методи асинхронної конкурентності. Вони включають використання `SemaphoreSlim` з `Task.WhenAll` (але без необов'язкового `Task.Run`), і `TPL ActionBlock / BufferBlock` (працюють як асинхронна `ConcurrentQueue`).

Наприклад, підхід з `SempahoreSlim` може бути спрощений до такого:

```c#
var throttler = new SemaphoreSlim(initialCount: maxThreads);
var tasks = urls.Select(async url =>
{
    await throttler.WaitAsync();
    try
    {
        var html = await client.GetStringAsync(url);
        Console.WriteLine($"retrieved {html.Length} characters from {url}");
    }
    finally
    {
        throttler.Release();
    }
});
await Task.WhenAll(tasks);
```
І його навіть можна спростити ще більше, якщо визначити метод розширення `LockAsync` для `SemaphoreSlim`.

---
layout: post
title:  "Публікація .NET Core WebApp безкоштовно"
date:   2020-05-21 10:00:00 +0200
date_friendly: 21 травня 2020 р. 
categories: [Програмування, dotNET]
tags: [dotnet, asp.net core, deployment, heroku]
---
![](/assets/img/posts/2020-05-21-deploy-dotnet-core-app-for-free/cover.png)

В багатьох програмістів є власні проекти на .NET Core, які в певний момент хочеться показати іншим. Бажано, щоб розгортання відбувалось просто і швидко, а хостинг був безкоштовним. В цій замітці я розкажу, як розгортати проекти на .NET Core в Heroku з безперервною доставкою, не вкладаючи в це ні копійки.

## Передумови
Для роботи нам потрібні будуть **.NET Core SDK** (у мене встановлено версію 3.1), **Git** для роботи з репозиторієм та **Heroku CLI** для роботи з Heroku. Сподіваюсь, ви вже маєте [.NET Core](https://dotnet.microsoft.com/download) та [Git](https://git-scm.com/). Як встановити Heroku CLI я розкажу далі.

## Heroku та безкоштовний dyno

**[Heroku](http://heroku.com)** - хмарний провайдер, що дозволяє запускати веб програми і сервіси написані на багатьох мовах, серед яких Java, Node.JS, Scala, Python, PHP, Ruby, Go та Clojure. Heroku була однією з перших хмарних платформ. В її основі лежить система віртуалізації побудована на ізольованих Linux контейнерах, які в Heroku називаються **dyno**. Тобто, dyno - це ніби окремий віртуальний комп'ютер, що виконує вашу програму на серверах Heroku. 

Безкоштовно Heroku надає один dyno з наступними характеристиками:
* 512 MB оперативної пам'яті
* 550 годин виконання кожного місяця

Dyno бувають двох типів:
* web - для програм що очікують вхідних HTTP запитів
* worker - для програм, що виконують операції у фоні

![](/assets/img/posts/2020-05-21-deploy-dotnet-core-app-for-free/free-plan-capabilities.png)

Якщо ви використовуєте для виконання своєї програми лише безкоштовний dyno, варто зауважити, що Heroku призупиняє виконання dyno після 30 хв бездіяльності. Тобто, якщо за останні 30 хв. до вашого web dyno не надійшло жодного запиту, він буде поставлений на паузу. Для користувача це може виглядадти так, ніби сайт в браузері перший раз відкривається довго. Наступні запити будуть виконуватись на максимально можливій швидкості. В цей час, поки ваш dyno спить, він НЕ споживає вільні години. Іншими словами, якщо ваш тестовий проект досить навантажений і обслуговує користувачів 24 години на добу вам вистачить вільних хвилин лише на 23 дні в місяць. 

> Heroku дає можливість розширити кількість вільних хвилин до 1000 просто вказавши реквізити банківської карти в налаштуваннях, без жодних списань коштів. Це дає можливість працювати одному free dyno без зупинки 24/7 або двом-трьом free dyno, якщо навантаження на сайт не постійне. 

## Налаштування Heroku CLI

Давайте створимо безкоштовний акаунт на [Heroku](https://signup.heroku.com/) і розгорнемо в ньому просту ASP.NET Core програму. Після реєстрації і підтвердження поштової адреси завантажте [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install). Це консольна утиліта, що спростить нам створення і розгортання нашої веб програми без відвідування сайту. Далі ми будемо все робити через командний рядок, тому важливо, щоб вона була встановлена.

Перевірте, чи ви маєте все необхідне для роботи. Версії програм можуть відрізнятись, це не принципово. Головне, що .NET, Git and Heroku CLI встановлені коректно.

```bash
> dotnet --version
3.1.300-preview-015115

> git --version
git version 2.24.1.windows.

> heroku --version
heroku/7.30.0 win32-x64 node-v11.14.0
```

## Створення програми ASP.NET Core
Створимо ASP.NET Core веб програму і назвемо її dotnet-app-heroku.

```bash
> dotnet new webapp --name DotnetAppHeroku --output dotnet-app-heroku       
The template "ASP.NET Core Web App" was created successfully.
...
Restore succeeded.
```

Створимо програму в Heroku, але спочатку необхідно пройти процедуру логіну.

```bash
> cd dotnet-app-heroku
> heroku login   
heroku: Press any key to open up the browser to login or q to exit:
Opening browser to https://cli-auth.heroku.com/auth/cli/browser/12b5558d-f062-4dbb-a055-1c7e9f0f84c5
Logging in... done
Logged in as elexander+heroku@ukr.net

> heroku create dotnet-app-heroku
Creating ⬢ dotnet-app-heroku... done
https://dotnet-app-heroku.herokuapp.com/ | https://git.heroku.com/dotnet-app-heroku.git

```
В результаті команди `create` ми отримали дві URL адреси, що знадобляться нам пізніше. Перша - це адреса нашого майбутнього сайту в Інтернет, а друга - адреса Git репозиторію, в який нам необхідно проштовхнути наш код, щоб розгорнути веб програму. 

> Вам не варто використовувати ту саму назву для програми. Змініть її на щось унікальне, наприклад `%USERNAME%-dotnet-app-heroku`. Це дасть змогу уникнути конфліктів, адже моя програма в цей момент може бути розгорнута, а адреси сайтів в Інтернет повинні бути унікальними.

Створимо git репозиорій в папці проєкту, додамо всі файли і спробуємо проштовхнути код у репозиторій.

```bash
> git init
Initialized empty Git repository in ./dotnet-app-heroku/.git/

> git remote add origin https://git.heroku.com/dotnet-app-heroku.git

> git add .

> git commit --message "Initial add"      
[master (root-commit) f471c3c] Initial add
 57 files changed, 39806 insertions(+)
 create mode 100644 DotnetAppHeroku.csproj
 create mode 100644 Pages/Error.cshtml
 ...

 > git push origin master
 Enumerating objects: 76, done.
...
Total 76 (delta 12), reused 0 (delta 0)
remote: Compressing source files... done.
remote: Building source:
remote:
remote:  !     No default language could be detected for this app.
remote:  HINT: This occurs when Heroku cannot detect the buildpack to use for this application 
```

Команда `git push` звершилась з помилкою `No default language could be detected for this app`. Причина в тому, що Heroku не підтримує .NET проєкти, тобто не знає, як зкомпілювати та запустити ASP.NET веб програму. Давайте допоможемо йому.

## Контейнер в якості стеку

Всі dyno за умовчанням запускаються на Linux Ubuntu 18:
![](/assets/img/posts/2020-05-21-deploy-dotnet-core-app-for-free/dotnet-app-heroku-settings.png)

Але Heroku має можливість запустити будь-який **Docker** контейнер і таким чином дозволяє самостійно вирішувати, яка операційна система і фреймворк потрібні програмісту. 

Для цього нам необхідно: 
1. Змінити стек програми на `container`
2. Створити `Dockerfile`
3. Вказати Heroku де цей `Dockerfile` знаходиться

```bash
> heroku stack:set container
Stack set. Next release on ⬢ dotnet-app-heroku will use container.
Run git push heroku master to create a new release on ⬢ dotnet-app-heroku.
```
Тепер dyno буде використовувати для запуску контейнер, який ми зараз побудуємо. Створіть Dockerfile в каталозі проєкту з таким вмістом.

```docker
FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build-env
WORKDIR /app
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1
WORKDIR /app
COPY --from=build-env /app/out .

CMD dotnet DotnetAppHeroku.dll
```

Ми не будемо зупинятись на детальному розборі даного файлу. Якщо коротко, то він компілює проєкт з релізною конфігурацією і запускає його на виконання командою `dotnet DotnetAppHeroku.dll`. 

> Якщо ім'я вашого проекту відрізняється від DotnetAppHeroku вам необхідно змінити останній рядоку файлу.

Також необхідно створити в корні проєкту файл `heroku.yml`, де вказати шлях до Dockerfile. Heroku буде шукати файл для побудови образу в середині `heroku.yml`

```yaml
build:
  docker:
    web: Dockerfile
```

Тепер можна додати новостворені файли до репозиорію і знову зробити push.

```bash
> git add .                               
> git status                              
On branch master
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)        
        new file:   Dockerfile
        new file:   heroku.yml

> git commit --message "Added Dockerfile" 
[master 1f184b8] Added Dockerfile
 2 files changed, 15 insertions(+)
 create mode 100644 Dockerfile
 create mode 100644 heroku.yml

> git push origin master
Enumerating objects: 80, done.
...
remote: === Building web (Dockerfile)
remote: Sending build context to Docker daemon  4.404MB    
...
remote: Verifying deploy... done.
To https://git.heroku.com/dotnet-app-heroku.git
 * [new branch]      master -> master
```

## Змінна оточення PORT

Якщо відкрити сайт `https://dotnet-app-heroku.herokuapp.com/` в браузері ми побачимо помилку. 

![](/assets/img/posts/2020-05-21-deploy-dotnet-core-app-for-free/app-error.png)

Щоб розібратись, чому це сталося, переглянемо логи нашої програми:

```bash
> heroku logs
...
2020-05-22T08:33:01.674783+00:00 app[web.1]: Unhandled exception. System.Net.Sockets.SocketException (13): Permission denied
...
2020-05-22T08:33:01.674801+00:00 app[web.1]: at Microsoft.AspNetCore.Server.Kestrel.Transport.Sockets.SocketTransportFactory.BindAsync(EndPoint endpoint, CancellationToken cancellationToken)
```

Як бачимо, сталася помилка `Permission denied` під час відкриття порту на прослуховування. Механізми безпеки Linux працюють таким чином, що для прослуховування стандартного для **HTTP** порту **80** процесу необхідні права супер-користувача. В [документації](https://devcenter.heroku.com/articles/setting-the-http-port-for-java-applications) до Heroku можна знайти вирішення проблеми. Heroku очікує, що кожна програма буде стартувати не з довільним портом, а із портом заданим у змінній оточення **PORT**. Внутрішні механізми Heroku будуть відправляти на цей порт весь трафік із зовнішнього порту 80, на якому сайт буде доступний в Інтернет. Виправимо це в нашому проєкті і додамо відповідну конфігурацію для Kestrel серверу у файлі `Startup.cs`:

```c#
webBuilder
    .UseStartup<Startup>()
    .UseKestrel((context, options) =>
    {
        var port = Environment.GetEnvironmentVariable("PORT");
        if (!string.IsNullOrEmpty(port))
        {
            options.ListenAnyIP(int.Parse(port));
        }
    });
```

Тепер можна зберегти зміни і зробити пуш в репозиторій. Пуш займе близько хвилини, поки створиться Docker образ. Відкрийте `https://dotnet-app-heroku.herokuapp.com/`. Все працює!

![](/assets/img/posts/2020-05-21-deploy-dotnet-core-app-for-free/app-running.png)

## Висновок
Ми побачили, як:
1. Створити безкоштовний акаунт в Heroku та інсталювати Heroku CLI.
2. Створити проект ASP.NET Core та додати Dockerfile для компіляції проєкту в образ.
3. Розгорнути образ в Heroku завдяки команді `git push`.
4. Переглянути логи програми у разі помилки.
5. Використвувати змінні оточення Heroku для успішного старту програми. 

[Репозиторій на Github](https://github.com/alexmartyniuk/blog-dotnet-app-heroku)

## Наступні кроки
В наступних дописах я планую розглянути використання аддонів Heroku, які дають можливість підключати сервіси бази даних, кешування, логування, повнотекстового пошуку і багато чого іншого. Вони також мають безкоштовні версії, яких може бути цілком достатньо для вашого PET-проекту.

Також може бути цікавою документація по [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli-commands), яка дозволяє моніторити виконання ваших програм, переглядати кількість використаних годин, додавати інших співробітників до вашого проєкту і т.ін.
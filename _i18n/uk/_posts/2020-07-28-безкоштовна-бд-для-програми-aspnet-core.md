---
layout: post
title:  "Безкоштовна БД для програми ASP.NET Core"
date:   2020-07-28 10:00:00 +0200
date_friendly: 28 липня 2020 р. 
categories: [Програмування, dotNET]
tags: [dotnet, asp.net core, postgresql, heroku, EntityFramework, identity]
---

![](http://www.martyniuk.info/assets/img/posts/2020-07-28-add-database-to-app-in-heroku/cover.jpg)

В цій статті я розкажу про додатки **[Heroku](http://heroku.com)**, ми створимо базу даних **[PostgreSQL](https://www.postgresql.org/)** і налаштуємо її для підтримки процесу аутентифікації у веб-програмі ASP.NET Core. Це друга стаття циклу, тому варто ознайомитись з [попередньою](http://www.martyniuk.info/posts/deploy-dotnet-core-app-for-free/), в якій проєкт було створено і розгорнуто. Створена база даних не буде вимагати жодних фінансових витрат і гарно підходить для власного невеликого проєкту.

## Передумови

Для успішного виконання наступних кроків вам необхідно зареєструвати акаунт в [Heroku](http://heroku.com), якщо ви цього ще не зробили, та встановити такі інструменти:
* [Git](https://git-scm.com/)
* [.NET Core SDK](https://dotnet.microsoft.com/download)
* [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

Вся робота буде відбуватись в командному рядку. У якості редактору коду можна використовувати будь-який на ваш вибір.

У [попередній статті](http://www.martyniuk.info/posts/deploy-dotnet-core-app-for-free/) ми створили просту програму ASP.NET Core, налаштували її для роботи в Heroku і розгорнули у хмарі. В цій статті ми модифікуємо створений код: додамо аутентифікацію та базу даних для зберігання інформації про користувачів. Готовий код можна знайти на [Github](https://github.com/alexmartyniuk/blog-dotnet-app-heroku).


## Додатки Heroku
Heroku має безліч готових інструментів та сервісів, які називаються **Add-ons** (додатки). На [сторінці з додатками](https://elements.heroku.com/addons) можна знайти біля 150 сервісів, згрупованих по категоріям: Data Stores, Monitoring, Logging, Caching і т.д. Наприклад, тут є бази даних MySQL, Redis або MongoDB, сервіси повнотекстового пошуку Elasticsearch, стримінгу повідомлень Kafka, генерації PDF, обробки відео і багато іншого.

![](http://www.martyniuk.info/assets/img/posts/2020-07-28-add-database-to-app-in-heroku/heroku-addons.jpg)

Ми будемо використовувати сервіс бази даних, який називається [Heroku Postgres](https://elements.heroku.com/addons/heroku-postgresql). Він доступний в декількох планах: від найпростішого **Hobby Dev**, який обмежений 20-ти одночасними з'єднаннями і 10000-ми рядками, до найбільш потужного **Shield 8**, який надає 488 GB оперативної пам'яті і 3TB сховища. 

![](http://www.martyniuk.info/assets/img/posts/2020-07-28-add-database-to-app-in-heroku/postgresql-pricing.jpg)

## Масштабування Heroku Postgres
Heroku Postgres легко масштабується вертикально. Є можливість збільшувати розмір сховища і оперативної пам'яті, в якій знаходиться так званий `hot-data-set`, для швидшої оброки запитів. Для вертикального масштабування необхідно просто змінити план використання на вищий. Горизонтальне масштабування в Heroku Postgres можливе завдяки спеціальній конфігурації `leader-follower`. Вона дозволяє створювати декілька копій вашої бази даних, доступних лише для читання, які називаються `follower`. Дані в цих БД синхронізуються в реальному часі із основною базою, яка в термінології Heroku називається `leader`. Heroku забезпечує розташування баз даних `follower` та `leader` в різних дата-центрах, що підвищує їх надійність і дає можливість продовжити роботу вашій програмі у випадку виходу з ладу частини інфраструктури Heroku.

Нам цілком підйде план Hobby Dev, адже **10000** рядків - це більше ніж достатньо для демострації аутентифікації у веб-програмі. Для даного плану Heroku забезпечує доступність БД на рівні 99.5%. Для вищих планів доступність вища і сягає 99.95%.

Варто додати, що Heroku Postgres доступна у двох регіонах - Північній Америці та Європі. Ми створимо БД у Європі, так як наша веб-програма також розміщена на сервері у Європі.


## Створення бази даних
Перейдіть в каталог з проєктом `dotnet-app-heroku`, що був створений в [попередній статті](http://www.martyniuk.info/posts/deploy-dotnet-core-app-for-free/). Перш за все, необхідно увійти в акаунт Heroku:

```powershell
> heroku login

heroku: Press any key to open up the browser to login or q to exit: 
Opening browser to https://cli-auth.heroku.com/auth/cli/browser/9e58d2b7-dd08-4dca-968e-5ef0ddaf399d
Logging in... done
Logged in as elexander+heroku@ukr.net
```

Створимо базу даних, вказавши хобі план та ім'я нашої програми в Heroku

```powershell
> heroku addons:create heroku-postgresql:hobby-dev --app dotnet-app-heroku

Creating heroku-postgresql:hobby-dev on ⬢ dotnet-app-heroku... free
Database has been created and is available
...
Created postgresql-horizontal-81849 as DATABASE_URL
Use heroku addons:docs heroku-postgresql to view documentation
```

Heroku записав інформацію про підключення до БД в змінну оточення `DATABASE_URL`. Пізніше ми зчитаємо її під час виконання програми і таким чином отримаємо інформацію про адресу серверу, ім'я користувача, його пароль і назву бази даних на сервері Postgres. 

> Ви не можете самостійно визначити параметри підключення, як ім'я користувача чи пароль, адже Heroku не надає вам окремий сервер бази даних, а дозволяє використовувати сервер спільно з іншими користувачами. До того ж, Heroku може змінити дані підключення, наприклад, адресу серверу, але в такому разі змінна оточення `DATABASE_URL` також буде оновлена. Враховуючи це, не варто зберігати рядок підключення в якомусь іншому місці, а тим більше у вихідному коді програми.


Перевіримо стан нашої бази даних і переконаймося, що план підключення дійсно не вимагає жодних витрат (Price = free):
```powershell
> heroku addons

Owning App         Add-on                       Plan                         Price  State  
─────────────────  ───────────────────────────  ───────────────────────────  ─────  ───────
dotnet-app-heroku  postgresql-horizontal-81849  heroku-postgresql:hobby-dev  free   created
```

## Налаштування програми для роботи з БД
Тепер, коли база даних створена, необхідно додати аутентифікацію в нашу програму ASP.NET Core. Нам знадобляться додаткові пакети для роботи з `Microsoft Identity` та `EntityFramework Core`. Їх можна додати командою `dotnet add package`:

```powershell
> dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
> dotnet add package Microsoft.AspNetCore.Identity.UI     
> dotnet add package Microsoft.EntityFrameworkCore.Design
> dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL

info : PackageReference for package 'Microsoft.AspNetCore.Identity.EntityFrameworkCore' version '3.1.6' added
info : PackageReference for package 'Microsoft.AspNetCore.Identity.UI' version '3.1.6' added
info : PackageReference for package 'Microsoft.EntityFrameworkCore.Design' version '3.1.6' added
info : PackageReference for package 'Npgsql.EntityFrameworkCore.PostgreSQL' version '3.1.4' added
```

Тепер додамо клас `ApplicationDbContext`, це вкрай важлива частина при роботі з EntityFramework і точка доступу до нашої бази даних. Цей клас повинен наслідуватись від `IdentityDbContext`, тому що ми хочемо, щоб Microsoft Identity був прив'язаний до нашого контексту, а отже дані користувачів зберігались у створеній нами базі даних.

Створіть новий файл `ApplicationDbContext.cs` з таким вмістом:
```c#
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DotnetAppHeroku
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
    }
}
```

Наразі EntityFramework не знає як працювати з конкретною базою даних, адже це універсальний фреймворк, що надає функції маппінгу об'єктів C# в записи бази даних. Тож нам необхідно використати відповідний драйвер. Для Postgres найбільш популярним є пакет **[Npgsql](https://www.nuget.org/packages/Npgsql/)**. В [цьому дописі](https://www.npgsql.org/efcore/) ви можете подивитись як підключити базу даних `PostgreSQL` з `EntityFramework Core` до вашої програми. Як ви бачите, для конфігурації драйверу необхідно передати рядок з'єднання у форматі `Host=my_host;Database=my_db;Username=my_user;Password=my_pw`. Де взяти ці данні? Запитаємо конфігурацію нашої програми у Heroku.

```powershell
> heroku config --app dotnet-app-heroku

=== dotnet-app-heroku Config Vars
DATABASE_URL: postgres://zevxwvnofzdqgh:6fbfa85e483c547461d8dd1b1cdb5c3889ee11016ac278626056d317f20eb590@ec2-52-22-216-69.compute-1.amazonaws.com:5432/d67ogunajtekdt
```

Як бачите, Heroku створив змінну оточення `DATABASE_URL`, але формат рядка з'єднання дещо відрізняється від того, що очікує драйвер `Npgsql`. PostgreSQL використовує загальноприйнятий стандарт URL для підключення до БД. Цей формат описаний в [документації](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING):

```
postgresql://[user[:password]@][netloc][:port][,...][/dbname]
```

Нам необхідно додати трохи коду, щоб перетворити URL, який пропонує Heroku, в конфігурацію з'єднання, яку вимагає EntityFramework.

Додайте файл `ConfigurationExtensions.cs` з наступним вмістом:
```csharp
using System;
using Microsoft.Extensions.Configuration;

namespace DotnetAppHeroku
{
    public static class ConfigurationExtensions
    {
        public static string GetConnectionString(this IConfiguration configuration)
        {
            var uri = new UriBuilder(configuration["DATABASE_URL"]);
            return $"Host={uri.Host};" + 
                   $"Database={uri.Path.Remove(0,1)};" + 
                   $"Username={uri.UserName};" + 
                   $"Password={uri.Password};" + 
                    "sslmode=Require;" + 
                    "Trust Server Certificate=true;";
        }
    }
}
```

Два останні параметри `sslmode=Require` та `Trust Server Certificate=true;` необхідні, адже Heroku підтримує тільки з'єднання, що захищені через SSL.

Маючи метод розширення, що повертає рядок для з'єднання, можемо налаштувати контекст бази даних та сервіси `Identity`:

Змініть метод `ConfigureServices` у файлі `Startup.cs`, щоб він містив дану конфігурацію:
```c#
public void ConfigureServices(IServiceCollection services)
{
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(
            Configuration.GetConnectionString()));
    services.AddDefaultIdentity<IdentityUser>(options =>
        options.SignIn.RequireConfirmedAccount = true)
            .AddEntityFrameworkStores<ApplicationDbContext>();

    services.AddRazorPages();
}
```

Також додайте аутентифікацію в методі `Configure`:

```c#
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
...
    app.UseAuthentication();
    app.UseAuthorization();
...
```

Тепер підключення до бази даних налаштоване і ми можемо згенерувати таблиці, індекси та інші об'єкти БД, що потребує `Identity`:

```powershell
> dotnet ef migrations add InitialMigration

Build started...
Build succeeded.
Done. To undo this action, use 'ef migrations remove'
```

Застосуємо створену міграцію до бази даних:

```powershell
> dotnet ef database update

Build started...
Build succeeded.
Done.
```

Після цього можемо переконатись, що база даних була успішно створена та містить всі необхідні таблиці. Для цього я підключився до бази даних через менеджер [HeidiSQL](https://www.heidisql.com/):

![](http://www.martyniuk.info/assets/img/posts/2020-07-28-add-database-to-app-in-heroku/databse-structure.jpg) 

## Налаштування інтерфейсу аутентифікації

Нам залишилось змінити інтерфейс веб-програми, аби зробити можливою реєстрацію користувача і його наступний вхід:
1. Додати новий шаблон для сторінки реєстрації та входу.
2. Підключити доданий шаблон до головної сторінки.
3. Додати Identity UI до нашої програми. 

Тож додамо в папку `Pages/Shared` файл `_LoginPartial.cshtml`:
```html
@using Microsoft.AspNetCore.Identity
@inject SignInManager<IdentityUser> SignInManager
@inject UserManager<IdentityUser> UserManager

<ul class="navbar-nav">
@if (SignInManager.IsSignedIn(User))
{
    <li class="nav-item">
        <a  class="nav-link text-dark" asp-area="Identity" asp-page="/Account/Manage/Index" title="Manage">Hello @User.Identity.Name!</a>
    </li>
    <li class="nav-item">
        <form class="form-inline" asp-area="Identity" asp-page="/Account/Logout" asp-route-returnUrl="@Url.Page("/", new { area = "" })" method="post" >
            <button  type="submit" class="nav-link btn btn-link text-dark">Logout</button>
        </form>
    </li>
}
else
{
    <li class="nav-item">
        <a class="nav-link text-dark" asp-area="Identity" asp-page="/Account/Register">Register</a>
    </li>
    <li class="nav-item">
        <a class="nav-link text-dark" asp-area="Identity" asp-page="/Account/Login">Login</a>
    </li>
}
</ul>
```

У файлі `_Layout.cshtml` знайдіть елемент `div` з класом `"navbar-collapse"` і додайте рядок відразу за ним:
```html
<partial name="_LoginPartial" />
```

Створіть папку `Areas\Identity\Pages\` і в ній файл `_ViewStart.cshtml`:
```c#
@{
    Layout = "/Pages/Shared/_Layout.cshtml";
}
```

Додайте до файлу імпорту `_ViewImports.cshtml` простір імен для `Microsoft Identity`:
```c#
@using Microsoft.AspNetCore.Identity
```

Тепер можна виконати `build` проєкту і переконатись, що все працює. Зробіть коміт і пуш у репозиторій Heroku. Ваша програма буде автоматично розгорнута (адже ми сконфігурували це в першій статті) і через деякий час доступна за адресою `http://dotnet-app-heroku.herokuapp.com/`. Спробуйте зареєструвати нового користувача і потім увійти від його імені:

![](http://www.martyniuk.info/assets/img/posts/2020-07-28-add-database-to-app-in-heroku/working-app.jpg) 

## Статистика використання БД

Давайте переглянемо деяку статистику по базі даних, що дасть нам уявлення про те, як вона використовується і які обмеження порушені:

```powershell
> heroku pg:info

=== DATABASE_URL
Plan:                  Hobby-dev
Status:                Available
Connections:           1/20
PG Version:            12.3
Created:               2020-07-28 16:28 UTC
Data Size:             8.5 MB
Tables:                8
Rows:                  2/10000 (In compliance)
Fork/Follow:           Unsupported
Rollback:              Unsupported
Continuous Protection: Off
Add-on:                postgresql-horizontal-81849
```

Як бачимо, на даний момент є одне з'єднання і використано 8.5 MB сховища. Також створено 8 таблиць і 2 рядки: перший рядок для новоствореного користувача і другий - це запис в таблиці з міграціями EntityFramework Core.

## Висновок
Ми побачили, як:
1. Створити базу даних `PostgreSQL` в `Heroku`.
2. Налаштувати `EntityFramework Core` та `Microsoft Identity` для роботи з базою даних.
3. Додати елементи інтерфейсу для реєстрації та входу користувача.
4. Переглянути статистику використання бази даних.

[Репозиторій на Github](https://github.com/alexmartyniuk/blog-dotnet-app-heroku)

Більш детальну інформацію про Heroku Postgres ви можете знайти в [офіційній документації](https://devcenter.heroku.com/articles/heroku-postgresql#provisioning-heroku-postgres).
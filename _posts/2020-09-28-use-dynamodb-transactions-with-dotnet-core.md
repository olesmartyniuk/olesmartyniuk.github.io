---
layout: post
published: true
title:  "Транзакції в DynamoDB"
date:   2020-09-28 23:00:00 +0200
date_friendly: 28 вересня 2020 р. 
categories: [Програмування, dotNET]
tags: [dotnet, DynamoDB, AWS, NoSQL, transaction, ACID]
---

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/cover.jpg)

Протягом багатьох років в розробці програмного забезпечення домінували реляційні бази даних. SQL стала однією з найпоширеніших мов програмування завдяки транзакціям, тригерам та об'єднанню даних на рівні БД. Але на початку 21 століття розвиток WEB 2.0 і потреби таких компаній як Google і Facebook спричинили революцію в збереженні даних. 

Сувора узгодженість і внутрішнє об'єднання даних стали менш важливими за високу доступність, швидкість та можливість горизонтального масштабування. З часом сформувалась стійка думка, що NoSQL бази даних - це для не впорядкованих даних великих розмірів, що необхідно зберігати в кластері та швидко отримувати. Тоді як SQL - це для структурованих даних, які пов'язані відношеннями і повинні бути суворо узгодженими завдяки механізму транзакцій. 

Перед проектування систем програмісти почали себе запитувати: що важливіше - [ACID](https://uk.wikipedia.org/wiki/ACID) чи висока доступність та швидкість? Така ситуація тривала деякий час, аж поки в NoSQL базах даних не з'явились транзакції. 

В цій статті я розкажу про транзакції в одній з перших NoSQL баз даних - Amazon DynamoDB. Подивимось чим вони відрізняються від транзакцій в SQL, в яких випадках варто будувати програми з їх використанням і як працювати з ними в C# та .NET Core.

# DynamoDB

Познайомимось з деякими концептами цієї бази даних. 

[DynamoDB](https://aws.amazon.com/dynamodb/) - документна база даних без схеми. Вона зберігає дані в таблицях, кожна з яких може розміщуватись на декількох серверах, розподіляючи таким чином навантаження. Це дозволяє DynamoDB обробляти мільйони запитів за секунду в пікові періоди.

Для представлення документів DynamoDB використовує формат JSON. Створення таблиці вимагає лише трьох аргументів: імені таблиці, ключа та списку атрибутів, серед яких повинен бути атрибут, що використовується як *ключ секції*. 

Ключ секції (Partition Key) використовується для визначення фізичного розміщення запису. Ключ секції разом з необов'язковим ключем сортування (Sort Key) створюють *первісний ключ*, що дозволяє унікально ідентифікувати запис в таблиці DynamoDB.

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/dynamodb-table.jpg)

Тоді як реляційні бази даних пропонують досить потужну мову запитів SQL, DynamoDB пропонує лише операції `Put`, `Get`, `Update` та `Delete` на одиночних таблицях і взагалі не пропонує можливості об'єднання таблиць. Через цю простоту DynamoDB дуже добре масштабується і має високу пропускну здатність. 

Ще однією особливістю БД є те, що її використання тарифікується не за місцем, яке займають дані, а за пропускною здатністю, що вимірюється так званими `RCU` та `WCU`. 

`RCU` (read capacity unit) - це одиниця, що відповідає одному запиту на читання до 4 Kb даних. `WCU` (write capacity unit) - аналогічно для запису, тільки ліміт даних - 1 Kb.

# Локальний сервіс
Давайте спробуємо запустити DynamoDB локально і виконати прості запити для створення таблиці і запису даних.

Для роботи нам знадобляться [Docker](https://www.docker.com/) та [.NET Core SDK](https://dotnet.microsoft.com/download). 

Amazon пропонує локальну версію DynamoDB у вигляді Docker образу. Вона повністю підтримує транзакції, тому акаунт AWS нам не потрібен - все будемо робити на локальному комп'ютері.

Відкриємо консоль і запустимо DynamoDB:

```powershell
docker run -p 8000:8000 amazon/dynamodb-local

...
Initializing DynamoDB Local with the following configuration:
Port:           8000
InMemory:       true
DbPath:         null
SharedDb:       false
shouldDelayTransientStatuses:   false
CorsParams:     *
```

Docker завантажив образ `dynamodb-local` і запустив сервіс на порту `8000`. Тепер ми можемо звернутися до бази даних за адресою `http://localhost:8000`. 

Дані будуть збережені в пам'яті, про що свідчить параметр `InMemory: true`, тому `DbPath` (шлях до файлу даних) порожній. Якщо ви бажаєте зберігати дані на диску між запусками контейнеру вам [необхідно вказати параметри](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html) `-sharedDB` та `-dbPath`.

# Система замовлення таксі

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-illustration.png)

Перед тим як створити першу таблицю, опишемо предметну область, яку ми будемо моделювати.

Припустимо у нас є система замовлення таксі. Є клієнт, водій і, власне, замовлення. Опишемо деякі вимоги до нашої системи.

1. Коли клієнт замовляє поїздку створюється замовлення.
2. Водій автомобіля приймає замовлення до роботи.
3. Водій не може прийняти замовлення, яке вже в роботі.
4. Водій не може прийняти замовлення, якщо він вже виконує інше замовлення.

Це дуже спрощена схема роботи таких сервісів, як Uber або Uklon. Звісно, можна придумати набагато більше вимог до такої системи, але для нас зараз вони не важливі. Нам важливо продемонструвати **ідемпотентність**, **узгодженність** та **атомарність** операцій з DynamoDB. 

Отже, які таблиці нам знадобляться в базі даних?

Перша - *клієнт*. Будь яка таблиця DynamoDB повинна містити унікальний ключ, нехай це буде телефонний номер клієнта. Також таблиця буде містити поточне замовлення цього клієнту. 

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/client-table.png)

У *водія* все схоже, тільки як унікальний ідентифікатор візьмемо номер машини. Так як модель водія дуже схожа на модель клієнта, то чому б нам не записати їх в одну таблицю? Назвемо її `Taxi`. 

В *замовленні* будуть міститись ідентифікатори водія, клієнта і статус замовлення: `Pending`, `InProgress`, `Done`. Замовлення також будемо зберігати в таблиці `Taxi`.

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table.png)

Уявімо, що в системі існує клієнт, водій та замовлення, яке вже знаходиться в статусі очікування.

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table-1.jpg)

Для розробників, які багато працювали з SQL така універсальна таблиця, що містить все на світі, може здатись дивною. Їм відразу захочеться розділити її та провести нормалізацію. Але у світі NoSQL це абсолютно звична річ. Такі таблиці називаються *гомогенними*. DynamoDB не буде марнувати місце на диску для збереження порожніх полів записів, адже вона збергіає документи, або колекції атрибутів. Amazon рекомендує використовувати саме гомогенні таблиці в DynamoDB. Їх рекомендація - [тримати пов'язані дані якомога ближче і мати мінімальну кількість таблиць](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html#bp-general-nosql-design-concepts). 

# AWS SDK та .NET Core
Створимо консольну програму в .NET Core та додамо пакет для роботи з DynamoDB API - `AWSSDK.DynamoDBv2`

```powershell
dotnet new console

...
Restore succeeded.

dotnet add package AWSSDK.DynamoDBv2

info : PackageReference for package 'AWSSDK.DynamoDBv2' version '3.5.0.22' added ...
...
```

У файлі `Program.cs` створимо клієнта для роботи з локальною базою даних і додамо метод для створення таблиці:

```c#

private static readonly AmazonDynamoDBClient client =
    new AmazonDynamoDBClient(new AmazonDynamoDBConfig {ServiceURL = "http://localhost:8000"});

private const string orderId = "{3e80b07d-e2e6-4310-8fda-851296a17a10}";
private const string driverId = "АК9265АК";
private const string clientId = "0993832478";
private const string tableName = "Taxi";

private static async Task CreateTable()
{
    await client.CreateTableAsync(new CreateTableRequest
    {
        TableName = tableName,
        AttributeDefinitions = new List<AttributeDefinition>
        {
            new AttributeDefinition
            {
                AttributeName = "Id",
                AttributeType = "S"
            }
        },
        KeySchema = new List<KeySchemaElement>
        {
            new KeySchemaElement
            {
                AttributeName = "Id",
                KeyType = "HASH"
            }
        },
        ProvisionedThroughput = new ProvisionedThroughput
        {
            ReadCapacityUnits = 5,
            WriteCapacityUnits = 5
        }
    });
}
```
> Код проекту можна знайти на [Github](https://github.com/alexmartyniuk/blog-dynamodb-transactions/)

Єдиним атрибутом який ми визначили є `Id` типу `String`. В схемі вказано, що поле `Id` буде ключем секції. Також необхідно вказати очікувану пропускну здатність, щоб DynamoDB знала як правильно масштабуватись. Для нас це не суттєво, нехай буде 5 одиниць за секунду для читання і запису.

Додамо клієнта, водія та замовлення як показано в таблиці вище. Використаємо нетранзакційний метод `PutItem`.

```c#
private static async Task AddClientDriverAndOrder()
{
    await client.PutItemAsync(new PutItemRequest
    {
        TableName = tableName,
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = clientId }},
            { "OrderId", new AttributeValue { S = orderId }}
        }
    });

    await client.PutItemAsync(new PutItemRequest
    {
        TableName = tableName,
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = driverId }}
        }
    });

    await client.PutItemAsync(new PutItemRequest
    {
        TableName = tableName,
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = orderId }},
            { "ClientId", new AttributeValue { S = clientId }},
            { "OrderStatus", new AttributeValue {S = "Pending"}}
        }
    });
}
```

# Транзакція в дії
Спробуймо реалізувати якусь більш складну операцію, наприклад, *водій бере замовлення у роботу*. Для того, щоб водій взяв замовлення нам необхідно:
* оновити рядок замовлення: 
  * записати номер машини водія в поле `DriverId`, якщо воно порожнє (водій не може взяти замовлення, яке вже виконується)
  * записати `InProgress` в поле `OrderStatus`, якщо воно було `Pending` (водій не може взяти замовлення в будь якому іншому статусі окрім "Очікує виконання")
* оновити рядок водія:
  * записати номер замовлення в поле `OrderId`, якщо воно порожнє (водій не може взяти одночасно два замовлення)

Тобто, кінцевий результат повинен виглядати наступним чином:

![](http://www.martyniuk.info/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table-2.jpg)

Тут нам знадобиться [ACID](https://uk.wikipedia.org/wiki/ACID) транзакція, адже оновити записи замовлення і водія потрібно синхронно. Якщо будь яка з перелічених вище умов не виконається, жодних змін в базі не має відбутися. 

```c#
private static async Task Main(string[] args)
{
    await CreateTable();
    await AddClientDriverAndOrder();
    await AssignOrderToDriver();
}

private static async Task AssignOrderToDriver()
{
    await client.TransactWriteItemsAsync(new TransactWriteItemsRequest
    {
        TransactItems = new List<TransactWriteItem>
        {
            new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = tableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = driverId }}
                    },
                    UpdateExpression = "set OrderId = :OrderId",
                    ConditionExpression = "attribute_not_exists(OrderId)",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>()
                    {
                        {":OrderId", new AttributeValue { S = orderId}}
                    }
                }
            },
            new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = tableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = orderId }}
                    },
                    UpdateExpression = "set DriverId = :DriverId, OrderStatus = :NewStatus",
                    ConditionExpression = "attribute_not_exists(DriverId) AND OrderStatus=:OldStatus",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>()
                    {
                        {":DriverId", new AttributeValue { S = driverId}},
                        {":OldStatus", new AttributeValue { S = "Pending"}},
                        {":NewStatus", new AttributeValue { S = "InProgress"}}
                    }
                }
            }
        },
        ClientRequestToken = "IdempotencyToken",
        
    });
}
```

В цьому коді ми виконуємо транзакцію, що складається з двох елементів `TransactWriteItem`. Якщо умова в `ConditionExpression` виконується, буде виконано вираз `UpdateExpression`. 

Для запису водія ми оновлюємо номер замовлення, якщо воно порожнє:
```c#
    UpdateExpression = "set OrderId = :OrderId",
    ConditionExpression = "attribute_not_exists(OrderId)",
```

Для запису замовлення ми оновлюємо поле водія та статус, якщо водій ще не був призначений, а статус дорівнює `Pending`:

```c#
    UpdateExpression = "set DriverId = :DriverId, OrderStatus = :NewStatus",
    ConditionExpression = "attribute_not_exists(DriverId) AND OrderStatus=:OldStatus",
```

Операція, що дозволяє водієві взяти замовлення, відповідає нашим трьом вимогам:
* Вона **ідемпотентна**. Повторне виконання методу не змінить стан бази даних і не викличе помилку. За це відповідає атрибут `ClientRequestToken`, який по суті є токеном ідемпотентності. Всі наступні запити до БД з тим самим `ClientRequestToken` будуть проігноровані. Це дозволяє, наприклад, водієві помилково натиснути два рази на кнопку прийняття замовлення.
* Вона **узгоджена**. Замовлення та запис водія змінюються синхронно таким чином, що водій не може взяти замовлення в іншому статусі окрім `Pending`. Замовлення в статусі `Pending` завжди буде мати пов'язаного водія.
* Вона **атомарна**. Запит або буде виконано повністю, або жодних змін до бази даних застосовуватись не буде.

# Можливі причини невдачі транзакцій
Якщо виконати даний метод але з некоректними даними (наприклад, водій намагається взяти в роботу чуже замовлення) він викличе помилку:
```c#
Amazon.DynamoDBv2.Model.TransactionCanceledException: 
'Transaction cancelled, please refer cancellation reasons for specific reasons...'
```

Транзакція може бути відмінена з декількох причин:
* не виконується умова в `ConditionExpression`
* одночасно виконується інша транзакція з тим самим записом 
* недостатня пропускна здатність (в нашому випадку це більше 5 викликів на секунду)
* недостатньо прав для виконання запиту (це стосується лише DynamoDB в AWS)

Що робити, коли ви отримали помилку викнання транзакції? Варто спробувати виконати операцію повторно. Переконайтесь, що ви встановили токен ідемпотентності (поле `ClientRequestToken`), тоді SDK може спробувати самостійно повторити запит.

Якщо ж ваша транзакція після автоматичних спроб не вдалась, необхідно виконати повторну спробу на рівні програми. Для цього необхідно перебудувати вихідний стан вашої програми і спробувати повторити транзакцію з новими умовами і новим бажаним кінцевим станом БД. 

Для отримання нового вихідного стану вашої програми (синхронізація з базою даних) можна обрати один з трьох методів:
* `ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD` - встановленя цього поля дозволяє при виконанні транзакції повернути значення атрибутів, якщо умова транзакції не була виконана.
* Виконати `TransactionGetItems` - транзакційно отримати всі необхідні дані самостійно.
* Працювати далі за умови, що узгодженість даних буде врешті-решт досягнута, можливо, після виконання повторного запиту.

# Порівняння з SQL
В SQL і деяких інших NoSQL рішеннях, таких як MongoDB, транзакції реалізовані в розмовному стилі. Першим викликом транзакція відкривається (`BEGIN TRANSACTION`), потім окремими викликами здійснюється модифікація даних (`INSERT`, `UPDATE`, `DELETE`). В кінці транзакція закривається (`COMMIT TRANSACTION`). 

Такий розподіл координації між клієнтом і сервером накладає деякі обмеження на транзакції і робить їх реалізацію більш складною, а виконання - повільнішим. 

Транзакції DynamoDB реалізовані в рамках *одного виклику API*. 

Транзакції DynamoDB працюють виключно на сервері і у клієнта немає контролю за початком транзакції, її підтвердженням або відміною. Це робить транзакції DynamoDB дуже швидкими і розробнику не потрібно обирати між транзакційною БД і БД, яка добре масштабується горизонтально.

Також, з транзакціями DynamoDB неможливі взаємні блокування, оскільки використовується оптимістичний контроль одночасності. Завдяки цьому забезпечується низька затримка та висока доступність.

# Обмеження транзакцій
Але в транзакцій DynamoDB є ряд обмежень, які варто врахувати:
* Транзакції працюють лише в рамках одного регіону і одного акаунту AWS.
* Транзакції можуть містити до десяти елементів, тобто можна оновити або додати не більше 10 записів за раз.
* Транзакції споживають в два рази більше `RCU` або `WCU`, так як всередині використовуюється двофазний механізм. Після виконання транзакції дані зчитуються ще раз для підтвердження їх коректності. Через це транзакційні виклики будуть в два рази дорожчими для споживача.

# Висновок
Транзакції в DynamoDB допомагають розробникам:
* підтримувати коректність даних, вносячи зміни в декілька записів і таблиць одночасно;
* спрощувати бізнес логіку програм, переносячи на сервер перевірку даних;
* оновлювати дані в багатьох таблицях узгоджено.

Транзакції DynamoDB повністю підтримують ACID і в той же час можуть необмежено масштабуватись для забезпечення низької затримки та високої доступності даних.

Для .NET розробників Amazon пропонує низькорівневий SDK для доступу до DynamoDB, який повністю підтримує транзакції. Його використання дещо багатослівне і може заплутати новачка, але якщо ви плануєте працювати з великими навантаженнями на базу даних і в той же час не хочете позбавляти себе ACID транзакцій, DynamoDB може бути хорошим вибором.

> Всі приклади коду можна знайти на [Github](https://github.com/alexmartyniuk/blog-dynamodb-transactions/)

Якщо є питання або зауваження, пишіть їх в коментарях. Приємного кодування!
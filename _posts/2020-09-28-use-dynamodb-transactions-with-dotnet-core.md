---
layout: post
published: false
title:  "Транзакції в NoSQL. Погляд на DynamoDB з позиції C#"
date:   2020-09-28 23:00:00 +0200
date_friendly: 28 вересня 2020 р. 
categories: [Програмування, dotNET]
tags: [dotnet, DynamoDB, AWS, NoSQL, transactions, ACID]
---

# NoSQL проти SQL

На протязі багатьох років в розробці програм домінували реляційні бази даних. SQL став однією з найпоширеніших мов програмування, а інженери що знали як правильно спроектувати і підтримувати роботу таких БД відокремились в окрему касту, що називається адміністратори БД або DBA. Після років розвитку SQL бази даних стали надійним інструментом при реалізації найрізноманітнішого роду програм, які вимагали узгодженості даних. Це стало можливим завдяки транзакціям, тригерам та об'єднанню даних (join) на рівні БД. Але на початку 20 століття розвиток WEB 2.0 і потреби таких компаній як Google, Facebook і Amazon спричинили революцію в збереженні даних. Сувора узгодженість і можливості внутрішнього об'єднання відступили під вимогами високої доступності, швидкості та горизонтального масштабування. З'явились такі СУБД як Neo4j, Memcached, Redis, MongoDB, Cassandra і Amazon DynamoDB. Вони призначались для збереження не структурованих даних в кластерних системах і сувора узгодженість тут не завжди була потрібна. З часом сформувалась стійка думка, що NoSQL бази даних - це для не впорядкованих даних великих розмірів, що необхідно розподіляти по багатьох серверах і швидко знаходити за примітивними запитами типу первісного ключа. В той час як SQL - це для структурованих даних, які містять відношення і повинні бути суворо узгодженими завдяки механізму транзакцій. Таке розділення способів зберігання даних призвело до породження специфічних підходів до проектування різних програмних систем. Програмісту чи архітектору перед тим як намалювати схему системи і включити в неї ту чи іншу БД необхідно було вирішити чи потрібна підсистемі зберігання даних сувора узгодженість. Що важливіше - ACID чи висока доступність та швидкість роботи з даними? Така ситуація тривала деякий час, аж поки в NoSQL базах даних не почали впроваджувати транзакції. 

В цій статті я розкажу як транзакції реалізовані в одній з перших NoSQL баз даних - Amazon DynamoDB, чим вони відрізняються від транзакцій в SQL, в яких випадках варто будувати програми з їх використанням та покажу як практично працювати з транзакціями в DynamoDB за допомогою C# та .NET Core.

# DynamoDB

Для початку познайомимось з деякими концептами цієї бази даних. DynamoDB - документна база даних, що позбавлена схеми. Вона зберігає дані в таблицях, кожна з яких може розміщуватись на декількох серверах розподіляючи навантаження. Це дозволяє DynamoDB оброблят мільйони запитів за секунду в пікові періоди і масштабуватись практично необмежено.

Для представлення документів DynamoDB використовує формат JSON. Створення таблиці вимагає лише трьох аргументів: імені таблиці, ключа та списку атрибутів, серед яких повинні бути атрибут, що використовується як ключ секції. Ключ секції (Partition Key) через застосування до нього функції гешування використовується для визначення фізичного розміщення запису. Ключ секції разом з необов'язковим ключем сортування (Sort Key або Range Key) створюють первісний ключ, що дозволяє унцікально ідентицікувати запис в таблиці DynamoDB.

Тоді як реляційні бази даних пропонують досить потужну мову запитів SQL, DynamoDB пропонує лише операції Put, Get, Update та Delete на одиночних таблицях і не взагалі пропонує будь яких об'єднань таблиць в запитах. Через цю простоту DynamoDB дуже добре масштабується і має практично необмежену пропускну здатність. 

Ще однією особливістю БД є те, що її використання тарифікується не за місцем, яке займають дані, а за пропускною здатністю, що вимірюється так званими RCU та WCU. RCU (read capacity unit) - це одиниця читання, що відповідає одному запиту на читання до 4 Kb даних. WCU (write capacity unit) - аналогічно працює на запис, тільки ліміт даних для одного WCU - 1 Kb.

Давайте спробуємо запустити DynamoDB локально і виконати прості запити на читання і запис даних.

Для роботи нам знадобляться Docker, .NET Core SDK, командний рядок та редактор коду, наприклад VSCode. Amazon пропонує локальну версію DynamoDB, яка повністю підтримує транзакції і нам цього достатньо. Тому акаунт AWS нам не потрібен, ми все будемо тестувати локально.

Відкриємо консоль і запустимо команду:

```powershell
> docker run -p 8000:8000 amazon/dynamodb-local

Unable to find image 'amazon/dynamodb-local:latest' locally
latest: Pulling from amazon/dynamodb-local
638b75f800bf: Pull complete
55cf0fc324c7: Pull complete
42245f4d852b: Pull complete
Digest: sha256:7d2178aa20b7a87a05af38cad98b06eedab9dcd4842c8d5290959e4732e63bf2
Status: Downloaded newer image for amazon/dynamodb-local:latest
Initializing DynamoDB Local with the following configuration:
Port:   8000
InMemory:       true
DbPath: null
SharedDb:       false
shouldDelayTransientStatuses:   false
CorsParams:     *
```

Docker завантжив образ dynamodb-local і запустив сервіс на порту 8000. Тепер ми можемо звернутись до бази даних за адресою localhost:8000. Дані будуть збережені в пам'яті, про що свідчить параметр `InMemory: true`, тому DbPath (шлях до файлу даних) порожній. Якщо ви бажаєте зберігати дані на диску між запусками контейнеру вам необхідно вказати параметри `-sharedDB` та `-dbPath`. [Детальніше](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html)

перед тим як створити першу таблицю, давайте опишемо предметну область, яку ми будемо моделювати.

# Система замовлення таксі

Нехай у нас є система замовлення таксі. Є клієнт, водій і замовлення. Опишемо деякі вимоги до нашої системи.

1. Клієнт замовляє поїздку, створюючи замовлення.
2. Водій автомобіля приймає замовлення до роботи.
3. Після доставки клієнта водій позначає замовлення виконаним.
4. Водій не може прийняти замовлення, яке вже в роботі.
5. Клієнт не може замовити більше однієї поїздки одночасно.

Це дуже спрощена схема роботи таких сервісів, як Uber або Uklon. Звісно, можна придумати набагато більше вимог до такої системи, але для нас зараз вони не важливі. Нам важливо продемонструвати ідемпотентність, узгодженність та атомарність операцій та як саме це може бути реалізованим з DynamoDB. Отже, які таблиці нам знадобляться в базі даних?

Нам потрібний клієнт. Так як будь яка таблиця DynamoDB повинна містити унікальний ключ, нехай це буде телефонний номер клієнта. Також таблиця буде містити поточне замовлення цього клієнту. Якщо поле замовлення порожнє - замовлень немає.

|Client  |
|--------|
|Id      |
|OrderId |

У водія все схоже, тільки як ідентифікатор візьмемо номер машини. Так як модель водія дуже схожа на модель клієнта, то чому б нам не записати їх в одну таблицю? 

|Taxi    |
|--------|
|Id      |
|OrderId |

В замовленні будуть міститись ідентифікатори водія, клієнта і статус замовлення: Pending, InProgress, Done.

|Taxi       |
|-----------|
|Id         |
|OrderId    |
|ClientId   |
|DriverId   |
|OrderStatus|

Уявімо що в системі існує клієнт, водій та замовлення від клієнту, яке в очікуванні.

Для тих розробників, які багато працювали з SQL така універсальна таблиця, що містить все на світі може здатись дивною і не правильно. Їм відразу захочеться розбити її на три і провести нормалізацію. Але у світі NoSQL - це абсолютно звична річ. Такі таблиці називаються гомогенними. DynamoDB не буде марнувати місце на диску для збереження порожніх полів записів, адже вона збергіає документи, або колекції атрибутів. Просто в колекції атрибутів для записів клієнта та водія будуть відсутніми ClientId, DriverId та OrderStatus, а для замовлень буде відсутнім атрибут OrderId. Крім того, сам Amazon рекомендує використовувати гомогенні таблиці в DynamoDB. Їх рекомендація - [тримати пов'язані дані якомога ближче і мати якнайменше таблиць в DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html#bp-general-nosql-design-concepts). 

Створимо консольну програму в .NET Core та додамо пакет для роботи з DynamoDB API - `AWSSDK.DynamoDBv2`

```powershell
> dotnet new console
...
Restore succeeded.

> dotnet add package AWSSDK.DynamoDBv2
info : PackageReference for package 'AWSSDK.DynamoDBv2' version '3.5.0.22' added ...
...
```

Зконфігуруємо клінта для роботи з локальною базою даних і додамо метод для створення таблиці:

```c#

private static readonly AmazonDynamoDBClient client =
    new AmazonDynamoDBClient(new AmazonDynamoDBConfig {ServiceURL = "http://localhost:8000"});

private static async Task CreateTable()
{
    await client.CreateTableAsync(new CreateTableRequest
    {
        TableName = "Taxi",
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

Єдиним атрибутом який ми визначили є Id типу String. В схемі визначено, що поле Id буде ключем секції. Також обов'язково необхідно вказати максимальну пропускну здатність, щоб DynamoDB знала як правильно масштабуватись. Для нас це не суттєво, нехай буде 5 одиниць за секунду для читання (RCU) і запису (WCU).

Додамо клієнта, водія та замовлення як показано в таблиці вище. Ці дані не узгоджені, тому використаємо звичайний `PutItem`, без транзакції.

```c#
private static async Task AddClientDriverAndOrder()
{
    await client.PutItemAsync(new PutItemRequest
    {
        TableName = "Taxi",
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = "0993832478" }},
            { "OrderId", new AttributeValue { S = "{3e80b07d-e2e6-4310-8fda-851296a17a10}" }}
        }
    });

    await client.PutItemAsync(new PutItemRequest
    {
        TableName = "Taxi",
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = "АК9265АК" }}
        }
    });

    await client.PutItemAsync(new PutItemRequest
    {
        TableName = "Taxi",
        Item = new Dictionary<string, AttributeValue>()
        {
            { "Id", new AttributeValue { S = "{3e80b07d-e2e6-4310-8fda-851296a17a10}" }},
            { "ClientId", new AttributeValue { S = "0993832478" }},
            { "OrderStatus", new AttributeValue {S = "Pending"}}
        }
    });
}
```

Для того, щоб водій взяв замовлення нам необхідно:
* оновити рядок замовлення: 
** записати Id водія в поле Driver, якщо воно порожнє (водій не може взяти замовлення, яке вже виконується)
** записати InProgress в поле Status, якщо воно було Pending (водій не може взяти замовлення в будь якому іншому статусі окрім "Очікує виконання")
* оновити рядок водія:
** записати Id замовлення в поле Order, якщо воно порожнє (водій не може взяти одночасно два замовлення)

Тобто, кінцевий результат повинен виглядати наступним чином:

Тут нам знадобиться ACID транзакція, адже оновити рядок замовлення і рядок водія потрібно синхронно. Якщо будь яка з перелічених вище умов не виконається, жодних змін в базі не має відбутися. 

```c#
private static async Task DriverTakesOrder()
{
    await client.TransactWriteItemsAsync(new TransactWriteItemsRequest
    {
        TransactItems = new List<TransactWriteItem>
        {
            new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = "Taxi",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = "АК9265АК" }}
                    },
                    UpdateExpression = "set OrderId = :OrderId",
                    ConditionExpression = "attribute_not_exists(OrderId)",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>()
                    {
                        {":OrderId", new AttributeValue { S = "{3e80b07d-e2e6-4310-8fda-851296a17a10}"}}
                    }
                }
            },
            new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = "Taxi",
                    Key = new Dictionary<string, AttributeValue>
                    {
                        { "Id", new AttributeValue { S = "{3e80b07d-e2e6-4310-8fda-851296a17a10}" }}
                    },
                    UpdateExpression = "set DriverId = :DriverId, OrderStatus = :NewStatus",
                    ConditionExpression = "attribute_not_exists(DriverId) AND OrderStatus=:OldStatus",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>()
                    {
                        {":DriverId", new AttributeValue { S = "0993832478"}},
                        {":OldStatus", new AttributeValue { S = "Pending"}},
                        {":NewStatus", new AttributeValue { S = "InProgress"}}
                    }
                }
            }
        }
    });
}
```

В цьому коді ми виконуємо транзакцію, що скаладаєтьс з двох оновлень даних. Якщо умова в `ConditionExpression` виконується - буде виконано вираз `UpdateExpression`. Для запису водія ми оновлюємо номер замовлення, якщо воно порожнє:
```c#
  UpdateExpression = "set OrderId = :OrderId",
  ConditionExpression = "attribute_not_exists(OrderId)",
```

Для запису замовлення ми оновлюємо поле водія та статус, якщо водій ше не був призначений а статус дорівнює `Pending`:

```c#
  UpdateExpression = "set DriverId = :DriverId, OrderStatus = :NewStatus",
  ConditionExpression = "attribute_not_exists(DriverId) AND OrderStatus=:OldStatus",
```

Документація по Amazon DynamoDB досить детально описує синтаксис [умовного виразу](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html) і [виразу оновлення даних](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html). Вони гарно підходять для більшості випадків.

Якщо повторно запустити даний метод він викличе помилку:
```
Amazon.DynamoDBv2.Model.TransactionCanceledException: 'Transaction cancelled, please refer cancellation reasons for specific reasons [ConditionalCheckFailed, ConditionalCheckFailed]'
```
`[ConditionalCheckFailed, ConditionalCheckFailed]` - мається на увазі, що умови в обох оновленнях не спрацювали, тому вся транзакція була відмінена.

Операція, що дозволяє водієві взяти замовлення відповідає нашим трьом вимогам:
* вона ідемпотентна - адже повторне виконання з тими ж вхідними даними не призведе до створення нового замовлення
* вона узгоджена - замовлення та рядок водія змінюються синхронно таким чином, що водій не може взяти замовлення в іншому статусі окрім Pending. В статусі Pending замовлення завжди буде мати пов'язаного водія.
* вона атомарна - запит або буде виконана повністю, або жодних змін до бази даних застосовуватись не буде




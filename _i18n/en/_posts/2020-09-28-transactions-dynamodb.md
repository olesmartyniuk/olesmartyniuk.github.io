---
layout: post
published: true
title:  "Transactions in DynamoDB"
date:   2020-09-28 23:00:00 +0200
date_friendly: 28 вересня 2020 р. 
categories: [Programming, .NET]
tags: [.NET, DynamoDB, AWS, NoSQL, transactions, ACID]
---

# NoSQL vs. SQL

For many years, relational databases dominated software development. SQL has become one of the most popular programming languages. But at the beginning of the 21st century, the WEB 2.0 and the needs of big companies such as Google and Facebook made a revolution in data storage.

Strict coherence and internal data aggregation have become less important than high availability, performance, and scalability. Over time, there has been a strong belief that NoSQL databases are for large data that needs to be stored in a cluster and retrieved quickly. Whereas SQL is for structured data that is related and must be strictly consistent through a transaction mechanism and foreign keys.

Before designing systems, programmers began to ask themselves: what is more important - [ACID](https://uk.wikipedia.org/wiki/ACID) or high availability and speed? This situation lasted for some time until transactions appeared in NoSQL.

In this article, I will talk about transactions in one of the first NoSQL databases - Amazon DynamoDB. Let's see how they differ from transactions in SQL, in which cases it is necessary to build programs with their use and how to work with them in C # and .NET Core.

# DynamoDB

[DynamoDB](https://aws.amazon.com/dynamodb/) - schemaless document database. It stores data in tables, each of which can be hosted on multiple servers, thus distributing the load. This allows DynamoDB to process millions of requests per second during peak periods.

DynamoDB uses the JSON format to persist documents. Creating a table requires only three arguments: the table name, key, and attribute list, which must include the attribute used as the *partition key*.

The Partition Key is used to determine the actual location of the record. Applying the HASH function to the partition key, DynamoDB finds the physical server in the cluster and the location on the server where the data will be written. The partition key together with the optional Sort Key create the *primary key*, which allows you to uniquely identify the record in the DynamoDB table.

![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/dynamodb-table-en.jpg)

While relational databases offer a fairly powerful SQL language for queries, DynamoDB offers only `Put`,` Get`, `Update` and` Delete` operations on single tables and can't combine tables at all. But because of this simplicity, DynamoDB is well scalable and has a high bandwidth.

Another feature of the database is that its use is charged not by the place occupied, but by the bandwidth measured by `RCU` and` WCU`.

`RCU` (read capacity unit) is a unit that corresponds to one read request up to 4 Kb of data. `WCU` (write capacity unit) - similar to read, only data limit - 1 Kb.

# Local DynamoDB
Let's try to run DynamoDB locally and execute simple queries to create a table and some records.

We need [Docker](https://www.docker.com/) and [.NET Core SDK](https://dotnet.microsoft.com/download) to work.

Amazon offers a local version of DynamoDB as a Docker image. It supports transactions, so we don't need an AWS account. We will do everything on the local computer.

Open the console and run DynamoDB:


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

Docker loaded the `dynamodb-local` image and launched the service on port `8000`. Now we can access the database at `http://localhost:8000`.

The data will be stored in memory, as a result of `InMemory: true` parameter, so`DbPath` (the path to the data file) is empty. If you want to store data on disk between container launches you [need to specify parameters](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html) `-sharedDB` and `-dbPath`.

# Taxi ordering system
![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-illustration.png)

Before creating the first table, we will describe the domain that we will model.

Suppose we have a taxi ordering system. There is a customer, a driver, and an order. We will describe some requirements for our system.

1. When a customer orders a trip, an order is created.
2. The driver of the car accepts the order to work.
3. The driver cannot accept an order that is already taken.
4. The driver cannot accept the order if he works on another order.

This is a very simplified scheme of services such as Uber or Uklon. Of course, you can come up with much more requirements for such a system, but for us now they are not important. It is important for us to demonstrate **idempotence**, **consistency** and **atomicity** of DynamoDB operations.

So what tables do we need in the database?

The first is *client*. Any DynamoDB table must contain a unique key, lets it be the customer's phone number. The table will also contain the current order of this customer.

![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/client-table.png)

The *driver* table is similar, but as a unique identifier we will use car number. Since the driver model is very similar to the customer model, why don't we write them down in one table? Let's call it `Taxi`.

The *order* will contain the driver, customer and order status: `Pending`,` InProgress`, `Done`. We will also save the order in the `Taxi` table.

![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table.png)

Imagine that there is a customer, driver, and order in a pending state.

![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table-1-en.jpg)

For developers familiar with SQL, such a general table may seem strange. They immediately want to divide and normalize it. But in the world of NoSQL this is a completely normal thing. Such tables are called *homogeneous*. DynamoDB will not waste disk space to save empty record fields, because it saves documents as attribute collections. Amazon advises using homogeneous tables in DynamoDB. Their recommendation is [keep related data as close as possible and have a minimum number of tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html#bp-general-nosql-design-concepts).

# AWS SDK and .NET Core
Create a console program in .NET Core and add a package to work with DynamoDB API - `AWSSDK.DynamoDBv2`

```powershell
dotnet new console

...
Restore succeeded.

dotnet add package AWSSDK.DynamoDBv2

info : PackageReference for package 'AWSSDK.DynamoDBv2' version '3.5.0.22' added ...
...
```

In the file `Program.cs` we will create the client for work with a local database and we will add a method for the creation of the table:

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
> The code can be found at [Github](https://github.com/alexmartyniuk/blog-dynamodb-transactions/)

The only attribute we defined is `Id` of type` String`. The diagram indicates that the `Id` field will be the section key. You also need to specify the expected bandwidth so that DynamoDB knows how to scale properly. For us it is not important, let it be 5 units per second for reading and writing.

We will add the customer, driver and order as shown in the table above. We use the non-transactional method `PutItem`.

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

# Transaction in action
Let's try to implement a more complex operation, for example, *the driver takes the order to work*. For this we need:
* update order line:
  * write the number of the driver's car in the field `DriverId`, if it is empty (the driver can not take the order, which is already being executed)
  * write `InProgress` in the field `OrderStatus`, if it was `Pending` (the driver can not take the order in any status other than `Pending`)
* update driver line:
  * write the order number in the field `OrderId`, if it is empty (the driver can not take two orders at once)

That is, the final result should look like this:

![](/assets/img/posts/2020-09-28-use-dynamodb-transactions-with-dotnet-core/taxi-table-2-en.jpg)

Here we need a [ACID](https://uk.wikipedia.org/wiki/ACID) transaction because we need to update the order record and the driver record at the same time. If any of the above conditions are not met, no changes to the database should occur.

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

In this code, we execute a transaction consisting of two elements `TransactWriteItem`. If the condition in `ConditionExpression` is met, the expression `UpdateExpression` will be executed.

To change the driver, we update the order number if it is empty:

```c#
    UpdateExpression = "set OrderId =: OrderId",
    ConditionExpression = "Attribute_not_exists (OrderId)",
```

To change the order, we update the driver field and status if the driver has not yet been assigned and the status is `Pending`:

```c#
    UpdateExpression = "set DriverId =: DriverId, OrderStatus =: NewStatus",
    ConditionExpression = "attribute_not_exists (DriverId) AND OrderStatus =: OldStatus",
```

This operation allows the driver to take the order and meets our three requirements:
* It is **idempotent**. Repeating the call will not change the state of the database and will not cause an error. This is due to the `ClientRequestToken` attribute, which is essentially an idempotency token. All subsequent queries to the database with the same `ClientRequestToken` will be ignored. This allows, for example, the driver to mistakenly press the order acceptance button twice.
* It is **consistent**. Order and driver records change synchronously so that the driver cannot take an order in a status other than `Pending`. An order in `Pending` status will always have a linked driver.
* It is **atomic**. The query will either be executed as a whole or no changes will be applied to the database.

# Reasons for transaction failure
If you perform this method but with incorrect data (for example, the driver tries to take someone else's order), it will cause an error:

```c#
Amazon.DynamoDBv2.Model.TransactionCanceledException:
'Transaction canceled, please refer cancellation reasons for specific reasons ...'
```

The transaction can be canceled for several reasons:
* the condition in `ConditionExpression` is not fulfilled
* another transaction with the same record is executed at the same time
* insufficient bandwidth (in our case it is more than 5 calls per second)
* not enough permissions to execute the request (this only applies to DynamoDB in AWS)

What to do when you get a transaction error? You should try the operation again. Make sure you have set the idempotency token (field `ClientRequestToken`), then the SDK can try to retry the request.

If your transaction fails after automatic attempts, you must retry at the application logic level. To do this, you need to rebuild the original state of your program and try to repeat the transaction with new conditions and a new desired state of the database.

To get a new initial state of your program (database synchronization), you can choose one of three methods:
* `ReturnValuesOnConditionCheckFailure = ReturnValuesOnConditionCheckFailure.ALL_OLD` - setting this field allows you to return attribute values ​​when executing a transaction if the transaction condition was not met.
* Execute `TransactionGetItems`, ie transactionally obtain all necessary data yourself.
* Continue working and expect eventually consistency will be achieved, maybe after a second request.

# Comparison with SQL
In SQL and some other NoSQL solutions, such as MongoDB, transactions are implemented in a conversational style. The first call opens the transaction (`BEGIN TRANSACTION`), then the individual calls modify the data (`INSERT`, `UPDATE`,` DELETE`). At the end, the transaction is closed (`COMMIT TRANSACTION`).

This distribution of coordination between the client and the server imposes some restrictions on transactions and makes their implementation more difficult and makes execution slower.

DynamoDB transactions are implemented within *a single API call*.

DynamoDB transactions run only on the server and the client has no control over the start of the transaction, its commit, or rollback. This makes DynamoDB transactions very fast and the developer does not need to choose between a transactional database and a database that scales horizontally.

Also, with DynamoDB transactions, mutual locking is not possible because optimistic concurrency control is used. This ensures low latency and high availability.

# Disadvantages of transactions
But DynamoDB transactions have a number of limitations to consider:
* Transactions only work within one region and one AWS account.
* Transactions can contain up to ten items, ie you can update or add up to 10 records at a time.
* Transactions consume twice as much `RCU` or` WCU`, as a two-phase mechanism is used inside: after the transaction, the data is read again to confirm their correctness. Because of this, transactional calls will be twice as expensive for the consumer.

# Conclusion
Transactions in DynamoDB help developers:
* maintain the correctness of the data by making changes to several records and tables simultaneously;
* simplify the business logic of programs by transferring data validation to the server;
* update data in many tables consistently.

DynamoDB transactions fully support ACID and at the same time can be scaled indefinitely to ensure low latency and high data availability.

For .NET developers, Amazon offers a low-level SDK for accessing DynamoDB that fully supports transactions. Its use is a little bit wordy and can confuse a beginner, but if you plan to work with heavy database loads and at the same time do not want to deprive yourself of ACID transactions, DynamoDB may be a good choice.

>All code examples can be found at [Github](https://github.com/alexmartyniuk/blog-dynamodb-transactions/)
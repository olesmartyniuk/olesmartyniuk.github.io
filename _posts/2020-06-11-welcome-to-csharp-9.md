---
layout: post
title:  "Зустрічайте C# 9.0"
date:   2020-05-28 19:00:00 +0200
date_friendly: 28 травня 2020 р. 
published: false
categories: [Програмування, dotNET]
tags: [dotnet, csharp, translation]
---

Це переклад статті ["Welcome to C# 9.0"](https://devblogs.microsoft.com/dotnet/welcome-to-c-9-0/) Мадса Торгерсена - працівника Microsoft і головного дизайнера мови C#.

C# 9.0 набуває форм і я хочу поділитись нашим баченням найбільш важливих можливостей, які ми додаємо в наступну версію цієї мови.

З кожною новою версією ми прагнемо зробити мову більш ясною і простою для більшості сценаріїв використання і C# 9.0 не є винятком. Одним з фокусів цього разу є забезпечення лаконічності в представленні даних та підтримка механізмів їх незмінності.

Що ж, поїхали!


## Властивості лише для ініціалізації

Ініціалізатори об'єктів просто чудові. Вони дають програмісту дуже гнучку і, водночас, легко читаєму форму створення об'єктів. Вони особливо зручні для створення вкладених об'єктів, коли ціла ієрархія об'єктів створюється однією командою. Ось приклад:

```c#
new Person
{
    FirstName = "Scott",
    LastName = "Hunter"
}
```

Ініціалізатори об'єктів також звільняють автора класу від написання шаблонного коду конструкторів. Все, що потрібно - лише створити властивості!

```c#
public class Person
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
}
```

Проте сьогодні тут є одне велике обмеження: щоб ініціалізатори працювали, властивості повинні бути такими, що змінюються (mutable). Вони функціонують завдяки виклику конструктора (без параметрів в даному випадку) і наступному присвоєнню значень через виклик сеттера.

Властивості p ініціалізацією виправлять це! Вони визначають `init` аксессор який дуже схожий на `set` аксессор, але може викликатись лише під час ініціалізації:  

```c#
public class Person
{
    public string FirstName { get; init; }
    public string LastName { get; init; }
}
```

З таким підходом код написаний вище все ще коректний, але всі наступні присвоєння значень властивостям `FirstName` і `LastName` будуть помилкою.

## Init аксессори та поля лише для читання

Because init accessors can only be called during initialization, they are allowed to mutate readonly fields of the enclosing class, just like you can in a constructor.

Так як init аксессори можуть викликатись лише під час ініціалізації, їм дозволено змінювати поля лише для читання того ж класу, точно так як ви можете зробити це у конструкторі.

```c#
public class Person
{
    private readonly string firstName;
    private readonly string lastName;
    
    public string FirstName 
    { 
        get => firstName; 
        init => firstName = (value ?? throw new ArgumentNullException(nameof(FirstName)));
    }
    public string LastName 
    { 
        get => lastName; 
        init => lastName = (value ?? throw new ArgumentNullException(nameof(LastName)));
    }
}
```

## Записи

Властивості з ініціалізацією чудово підходять, якщо ви хочете зробити певну властивість об'єкту незмінною. Якщо ж ви хочете зробити незмінним весь об'єкт, щоб він поводився як екземпляр типу-значення, вам необхідно визначити його як запис: 

```c#
public data class Person
{
    public string FirstName { get; init; }
    public string LastName { get; init; }
}
```

Ключове слово `data` у визначенні класу позначає клас як запис. Це додає йому певної поведінки як у типу-значення, яку ми розглянемо далі. Загалом, записи краще розглядати як "значення" (дані), а не як об'єкти. Вони не створені, щоб мати стан, який можливо змінити. Натомість, ви виражаєте зміни у часі, створюючи нові записи, що відображають новий стан. Їх однаковість визначається їх вмістом.

## Вираз with
When working with immutable data, a common pattern is to create new values from existing ones to represent a new state. For instance, if our person were to change their last name we would represent it as a new object that’s a copy of the old one, except with a different last name. This technique is often referred to as non-destructive mutation. Instead of representing the person over time, the record represents the person’s state at a given time.

To help with this style of programming, records allow for a new kind of expression; the with-expression:

При роботі з незмінними даними, загальний підхід - це створення копії для відображення нового стану. Для прикладу, якщо наша особа захоче змінити своє прізвище, ми реалізуємо це через створення нового об'єкту, що буде копією старого окрім різниці у прізвищі. Цю техніку часто називають неруйнівною мутацією. Замість того, щоб змінювати особу з часом запис відображає стан особи в конкретний момент часу.  

Щоб програмувати в такому стилі було легше, записи підтримують новий тип виразу - `with`:

```c#
var otherPerson = person with { LastName = "Hanselman" };
```

With вирази використовують синтаксис ініціалізаторів, щоб визначити чим будуть відрізнятись новий і старий об'єкти. Ви можете задати декілька властивостей.

Запис неявно включає захищений "конструктор копіювання" - це конструктор, який бере існуючий об'єкт запису і копіює його поля одне за одним в новий об'єкт:

```c#
protected Person(Person original) { /* copy all the fields */ } // generated
```

Вираз with викликає конструктор копіювання і потім застосовує ініціалізатор для визначених властивостей, але вже до проініціалізованих даних.

Якщо вас не влаштовує згенерований конструктор копіювання, ви можете визначити свій власний і він так само буде підхоплений виразом with. 

## Порівняння за значенням
Всі об'єкти наслідують віртуальний метод `Equals(object)` від класу object. Він є основою для статичного методу `Object.Equals(object, object)` коли обидва параметри не дорівнюють null.

Структури перевизначають його, щоб отримати "порівняння за значенням", це коли поля структури порівнюються рекурсивно через виклик Equals. Записи роблять так само.

Це означає те, що згідно з їх "значимістю", два об'єкти-записи можуть бути рівними, будучи різними екземплярами одного типу. Для прикладу, якщо ми повернемо назад прізвище у раніше зміненої особи:  

```c#
var originalPerson = otherPerson with { LastName = "Hunter" };
```

Тепер ми би мали `ReferenceEquals(person, originalPerson) = false` (це різні екземпляри), але `Equals(person, originalPerson) = true` (вони містять однакові дані).

Якщо вам не підходить порівняння по полям, що визначається за умовчанням, ви можете написати своє. Але треба бути обережним і розуміти, як працює порівняння за значеннями в структурах, особливо якщо використовується наслідування (до якого ми ще повернемося нижче).   

Поряд з перевизначенням `Equals` перевизначається також `GetHashCode()`, так як вони працюють у парі.

Data members
Records are overwhelmingly intended to be immutable, with init-only public properties that can be non-destructively modified through with-expressions. In order to optimize for that common case, records change the defaults of what a simple member declaration of the form string FirstName means. Instead of an implicitly private field, as in other class and struct declarations, in records this is taken to be shorthand for a public, init-only auto-property! Thus, the declaration:

## Поля записів
Записи задумувались незмінюваними і такими, що містять лише публічніні властивості з ініціалізаторами. Записи можуть змінюватись в не деструктивний спосіб завдяки with-виразам. Для того, щоб спростити визначення записів для цього поширеного застосування синтаксис запису змінює значення `string FirstName `. Замість неявного приватного поля, як це було б у визначенні класу чи структури, в синтаксисі запису це означає публічну авто-властивість з ініціалізатором! Таким чином, визначення:   

```c#
public data class Person { string FirstName; string LastName; }
```

Означає в точності те ж, що ми мали раніше:

```c#
public data class Person
{
    public string FirstName { get; init; }
    public string LastName { get; init; }
}
```
We think this makes for beautiful and clear record declarations. If you really want a private field, you can just add the private modifier explicitly:
```c#
private string firstName;
```

Ми вважаємо, це дозволяє зробити визначення запису чистим і красивим. Якщо вам дійсно потрібне приватне поле, ви завжди можете додати модифікатор `private`явно:

## Позиційні записи

Інколи зручно використовувати більш позиційний підхід до записів, при якому їх вміст передається через аргументи конструктора і може бути отриманий назад завдяки позиційному деконструюванню.

Абсолютно нормальним є визначення власного конструктора і деконструктора в записі:

```c#
public data class Person 
{ 
    string FirstName; 
    string LastName; 
    public Person(string firstName, string lastName) 
      => (FirstName, LastName) = (firstName, lastName);
    public void Deconstruct(out string firstName, out string lastName) 
      => (firstName, lastName) = (FirstName, LastName);
}
```

Але існує набагато коротший синтаксис для вираження того самого (зверніть увагу на регістр імен параметрів):

```c#
public data class Person(string FirstName, string LastName);
```

Цей запис визначає публічні авто-властивості і конструктор з деконструктором, тож ви можете написати:

```c#
var person = new Person("Scott", "Hunter"); // позиціне конструювання
var (f, l) = person;                        // позиціне деконструювання
```

Якщо вам не подобається згенерована авто-властивіть, ви можете визначити натомість свою власну з тими ж іменем, і згенеровані конструктор і деконструктор будуть її використовувати.

## Записис і мутація

Семантика значення не дуже добре поєднується зі змінюваним станом. Уявіть, ми помістили об'єкт запису в словник. Його наступне знаходження залежить від Equals та (інколи) GethashCode. Але, якщо запис змінює свій стан, він також змінює свою еквівалентність! Ми можемо не знайти його знову! В реалізації хеш таблиці це може пошкодити структуру даних, так як розміщення об'єкту грунтується на хеш коді, який він має в момент запису у таблицю.

Напевно, є допустимі приклади використання змінюваного стану записів, зокрема для кешування. Але ручна робота, необхідна для того, щоб перевизначити поведінку так, щоб ігнорувати цей стан, імовірно, буде досить значною.

# With-вираз та наслідування
Порівняння за значенням та не деструктивна мутація значно ускладнюються, коли поєднуються з наслідуванням. Давайте додамо похідний клас-запис до hfysit розглянутого прикладу:  

```c#
public data class Person { string FirstName; string LastName; }
public data class Student : Person { int ID; }
```

Почнемо наш приклад with-виразу зі створення екземпляру Student, але збережемо його у змінній типу Person:

```c#
Person person = new Student { FirstName = "Scott", LastName = "Hunter", ID = GetNewId() };
otherPerson = person with { LastName = "Hanselman" };
```

В останньому рядку з with-виразом компілятор не знає, що person фактично містить екземпляр Student. Тим не менш, новий екземпляр person не був би коректною копією, якби він не був екземпляром Student і не містив той самий ID, що і оригінальний об'єкт. 

C# робить це за нас. Записи містять прихований віртуальний метод, якому доручено клонування цілого об'єкту. Кожен похідний тип запису перевизначає цей метод і викликає конструктор копіювання для цього типу. Цей конструктор викликає аналогічний конструктор копіювання базового типу. With-вираз просто викликає прихований "clone" метод і застосовує ініціалізатор об'єкту до результату.

Value-based equality and inheritance
Similarly to the with-expression support, value-based equality also has to be “virtual”, in the sense that Students need to compare all the Student fields, even if the statically known type at the point of comparison is a base type like Person. That is easily achieved by overriding the already virtual Equals method.

However, there is an additional challenge with equality: What if you compare two different kinds of Person? We can’t really just let one of them decide which equality to apply: Equality is supposed to be symmetric, so the result should be the same regardless of which of the two objects come first. In other words, they have to agree on the equality being applied!

An example to illustrate the problem:

Person person1 = new Person { FirstName = "Scott", LastName = "Hunter" };
Person person2 = new Student { FirstName = "Scott", LastName = "Hunter", ID = GetNewId() };
Are the two objects equal to one another? person1 might think so, since person2 has all the Person things right, but person2 would beg to differ! We need to make sure that they both agree that they are different objects.

Once again, C# takes care of this for you automatically. The way it’s done is that records have a virtual protected property called EqualityContract. Every derived record overrides it, and in order to compare equal, the two objects musts have the same EqualityContract.


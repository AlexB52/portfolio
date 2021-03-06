---

title: Pragmatic refactoring 
date: 2021-03-15 21:55 UTC
tags: retest refactoring rubygem sandi metz
description: A 99 Bottles of OOP book review and introducing retest, a gem to help you refactor code on the fly.

---

[book]: https://sandimetz.com/99bottles
[retest]: https://github.com/AlexB52/retest

<small style="float:right;"> _18 March 2021_ </small>

# Pragmatic refactoring with _99 Bottles of OOP_

This article is sponsored by [retest][retest], a gem that helps you refactor ruby projects on the fly just like the methodology described in _[99 Bottles of OOP][book]_. Don't forget to smash like, subscribe and leave a comment.... I mean... Try retest, star the repository and leave an issue, now back to the article.

![demo](https://alexbarret.com/images/external/retest-demo-26bcad04.gif)
<small class="d-block text-center"><i>Refactor code one change at a time with [retest][retest].</i></small>

## A great refactoring book

Last year, I read the amazing _[99 Bottles of OOP][book]_ by Sandi Metz, Katrina Owen & TJ Stankus. The book explores OOP concepts and how to refactor code while being one `cmd + z` away from green tests. It teaches 'practical techniques for getting things done that lead, naturally and inevitably, to beautiful code', **by changing one line at a time**. That is right you read that properly. For every single line of code that changes your tests should remain green. If they fail, then undo the change and try again.

How is this possible? _[99 Bottles of OOP](book)_ explains the technique thoroughly. It is a bit tricky at the beginning but just like any technique, it becomes simpler over time. 

_The gif above gives an example of how this is possible although this particular example can be considered cheating._

## The methodology

The book is an ode to ['preparatory refactoring'](https://martinfowler.com/articles/preparatory-refactoring-example.html) by introducing a new feature for the 99 Bottles song. How can we replace any references of `6 bottles` to `1 six-pack` in the song? Simple to understand yet not trivial.

The authors go through the change following the `open/close principle`: Code is open to a new requirement when you can meet that new requirement without changing existing code. It is best expressed with this quote from Kent Beck.

> For each desired change, make the change easy (warning: this may be hard), then make the easy change. [Kent Beck](https://twitter.com/KentBeck/status/250733358307500032?s=20)


## Make the change easy

The first step to great refactoring is a good test coverage to increase confidence that new changes are preserving the code functionality. 

Good test coverage doesn't mean loads of tests and the book is a good example of that. _[99 Bottles of OOP](book)_ handles the entire refactoring with one simple yet reliable integration test: the code must be able to print out the full song after every new code change. One assertion on a single hardcoded string of 100 lines with no dependencies on the code being tested.

Developers tend to write a lot of coupled unit tests while shying away from slow integration tests or feature tests. I find it fascinating that the code in the book can be refactored with only this specific integration test. During the refactoring, the authors create new classes but no new tests. New classes are considered private and don't deserve any tests (just yet). Mind-blowing.

## Keep calm and carry on

The authors tell you to trust the process even if the code seems far from being open to change. Keep calm and continue refactoring, ultimately the code will reach a state where the new feature can be introduced. This refactoring phase is more of a mechanical process as it doesn't require a vision or sparks of ingenuity. It looks like this:

1. Change one line
2. Run the tests
3. If the tests fail, undo the change
4. Go back to step 1

The authors teach simple effective rules to help identify areas requiring refactoring like the Flocking rule. Then you repeat simple known atomic changes from Martin Folwer's book [refactoring](https://www.refactoring.com/) and your code will become ready for change. **Always.**

## Make the easy change

Only once the code is open do you go back to boring TDD:

* Make the tests fail by updating your test
* Make the change
* Make the tests pass
* gg 2ez

## Make it easy to understand

It's only at that point that the authors write unit tests to cover most, but not all, newly introduced classes. That is right, every class doesn't need unit tests when they can still be considered too small or private. This section of the book uses insightful methods to write tests that document and teach future devs how to use the new classes effectively. As tests are written, classes are still being refactored. Amazing chapter.

## The infamous test

Finally comes my only point of disagreement with the authors of this great book. They decide after this journey to delete the integration test. They cover the entire refactoring with one single test only to... remove it without an ounce of remorse. Not even a thank you, Marie Kondo would be ashamed.

While not being a unit test, it should be kept. It was testing the only class already in use in the fictive codebase. The test makes sure that printing the 99 Bottles of beer song still works which is supposedly an important part of the existing business rules. RIP integration test. 

## Conclusion

The book is in its 2nd edition. Reading it feels like drinking water from a water hose. You can expect to spill most of it but will catch refreshing bits here and there.

It's one of those books, like _[POODR](https://www.poodr.com/)_, which needs to be read a few times to start internalising the concepts properly. Just like any skill, theory is not enough. Read the book, practise, read the book again, practise again… Trust the process and keep looping. Every time you'll have new AHA! moments.

I recommend this book to developers with any level of experience and especially to senior developers who haven't refreshed their OOP basics for at least two years. This book will challenge your deeply ingrained practices and this exercise alone will make you a better developer. Who knows, you might even fall in love with factories again.

The book covers those topics well:

* Recognizing when code is "good enough"
* Getting the best value from Test-Driven Development (TDD)
* Doing proper refactoring, not random "rehacktoring"
* Locating concepts buried in code
* Finding names that convey deeper meaning
* Safely altering code by following the "Flocking Rules"
* Simplifying new additions with the Open/Closed Principle
* Avoiding conditionals by obeying the Liskov Substitution Principle
* Making targeted improvements by reducing Code Smells
* Improving changeability with polymorphism
* Manufacturing role-playing objects using Factories
* Hedging against uncertainty by loosening coupling
* Developing a programming aesthetic

## Retest gem

This book gave me the incentive to create a gem that facilitates this type of extreme refactoring: [retest][retest].

Retest is a small command-line tool to help you refactor code and works with every Ruby project (ruby, rspec, rails, rake). Designed to be dev-centric and project independent, it can be used on the fly. No Gemfile updates, no commits to a repo, no configuration files (like Guard) required to start refactoring. The gif at the start shows how to install and use the gem. 

~~~bash
$ gem install retest
$ retest --auto

# Start refactoring by making a change and save the file
~~~
{: data-target="code-highlighter.bash"}

If you're interested in reading _[99 Bottles of OOP][book]_ while going through the changes yourself this gem is for you. It will rerun the infamous integration test after every change you make.

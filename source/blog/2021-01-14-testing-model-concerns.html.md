---

title: Testing ActiveRecord Concerns
date: 2021-01-14 10:00 UTC
description: This article outlines how I test Rails concerns used on ActiveRecord models
tags: Rails, ActiveRecord, Concerns, Testing

---

{::options parse_block_html="true" /}

<small style="float:right;"> _14January 2021_ </small>

# Testing ActiveRecord Concerns

ActiveRecord classes manage persistence and have a tight relationship with the database table they're assigned to. This relationship makes testing sometimes tricky and even trickier when testing Rails concerns. This article describes how to test those concerns used in isolation from its ActiveRecord class and its associated database table.

The code examples are written using RSpec and switching to Minitest is possible but requires a fair bit of work.

## What are concerns?

Concerns are the Rails way to grant a role, include a module to a Ruby class. It provides a nicer syntax than Ruby and aims to clarify confusion around depedencies when used with nested modules. Here is the [documentation](https://api.rubyonrails.org/v6.1.0/classes/ActiveSupport/Concern.html).


## Example: The Reviewable Concern

In this example we'll look at a `Reviewable` concern that is included in an ActiveRecord class `Post`. To work properly the concern needs to be included in an ActiveRecord class hooked to a table with a `reviewed_at:datetime` column.

~~~ruby
  # app/models/concerns/reviewable.rb

  # requires #reviewed_at:datetime column
  module Reviewable
    extend ActiveSupport::Concern

    included do
      scope :reviewed, -> { where.not(reviewed_at: nil) }
      scope :unreviewed, -> { where(reviewed_at: nil) }
    end

    def reviewed?
      reviewed_at.present?
    end

    def review(time = DateTime.current)
      update(reviewed_at: time)
    end
  end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
  # app/models/post.rb
  class Post < ApplicationRecord
    include Reviewable

    # create_table "posts", force: :cascade do |t|
    #   t.datetime "reviewed_at"
    # end
  end
~~~
{: data-target="code-highlighter.ruby"}

## TL;DR Solution

Here is the gist for people looking to see how it is done. The main idea is to test every concerns with a vanilla ApplicationRecord class connected to a temporary database table. If you're interested to see how this works keep reading!

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ApplicationRecord
  include Reviewable
end

describe Reviewable do
  include InMemoryDatabaseHelpers

  switch_to_SQLite do
    create_table :fake_reviewables do |t|
      t.datetime :reviewed_at
    end
  end

  describe FakeReviewable, type: :model do
    include_examples 'reviewable' do
      let(:reviewable) { FakeReviewable.create }
    end
  end
end
~~~
{: data-target="code-highlighter.ruby"}

Let's take a moment to appreciate how explicit this is. The test displays all the information to teach future devs on how `Reviewable` concern is used: how the role is granted and the simplest schema required for an ActiveRecord to acquire the role. To understand what `Reviewable` does, someone can open `'path/to/reviewable/shared/examples'` and eliminate all the noise from huge test files by only seeing the tests related to `Reviewable` behaviour.

## Why test concerns in isolation?

Switching to an isolated table to test concerns ensure that concerns are decoupled from the first ActiveRecord class they've been introduced into, `Post` in this example.

Failing to extract and test your concern in another class than the original active record class is not reusable. It is also a smell that the role is not fully understood or is the wrong abstraction.

Having the concern tested this way gives more confidence in reusing `Reviewable` with any ActiveRecord class that has a `reviewed_at:datetime` column in its table.


## Testing

### Concerns and their interface

In OOP, to successfully test a role you need to define and test its public interface and Rails concerns are no exception. Because it is included in the `Post` model, we start by writing the interface tests in the `post_spec.rb` file.

~~~ruby
describe Post do
  describe 'reviewable role' do
    subject { described_class.new }

    it 'has the correct interface' do
      expect(subject).to respond_to(:reviewed?)
      expect(subject).to respond_to(:review)
      expect(described_class).to respond_to(:reviewed)
      expect(described_class).to respond_to(:unreviewed)
    end
  end
end
~~~
{: data-target="code-highlighter.ruby"}

### Concerns and Fakes

A role/concern is meant to be shared with other Ruby classes. Currently, `Reviewable` is only included in the `Post` model but nothing stops us from including it in other classes, especially testing classes. To do so we extract the role tests into shared tests and include those in the `post_spec.rb` file and a `reviewable_spec.rb` file like so:

~~~ruby
shared_examples 'reviewable'do
  subject { described_class.new }

  describe 'the interface' do
    it 'has the correct interface' do
      expect(subject).to respond_to(:reviewed?)
      expect(subject).to respond_to(:review)
      expect(described_class).to respond_to(:reviewed)
      expect(described_class).to respond_to(:unreviewed)
    end
  end
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
# spec/models/post_spec.rb
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable'
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
# spec/models/concerns/reviewable_spec.rb
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable
  def self.reviewed
  end

  def self.unreviewed
  end

  def reviewed?
  end

  def review
  end
end

describe FakeReviewable do
  it_behaves_like 'reviewable'
end
~~~
{: data-target="code-highlighter.ruby"}

### Concerns and ActiveRecord

One problem with this test is that while `Post` and `FakeReviewable` share the same interface, they do not share the same behaviour. More importantly that behaviour is tight to the existence of a table column `reviewed_at:datetime` hooked to the model class. Let's start by adding more tests.

~~~ruby
# requires a :reviewable object
shared_examples 'reviewable'do
  describe 'the interface' do
    subject { described_class.new }

    it 'has the correct interface' do
      expect(subject).to respond_to(:reviewed?)
      expect(described_class).to respond_to(:reviewed)
      expect(described_class).to respond_to(:unreviewed)
    end
  end

  describe '#reviewed?' do
    subject { reviewable.assign_attributes(reviewed_at: reviewed_at).reviewed? }

    context 'when reviewed_at is nil' do
      let(:reviewed_at) { nil }

      it { is_expected.to be false }
    end

    context 'when reviewed_at is present' do
      let(:reviewed_at) { DateTime.current }

      it { is_expected.to be true }
    end
  end

  describe '#review' do
    let(:time) { DateTime.current }

    subject { reviewable.review(time) }

    it 'updates the reviewed_at attribute' do
      expect { subject }.to change { reviewable.reload.reviewed_at }.from(nil).to(time)
    end
  end
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable' do
    let(:reviewable) { Post.create }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

While this causes no problem for `Post`, our `FakeReviewable` class is now in trouble. Few methods in the tests are now referring to ActiveRecord behaviours such as `#reload` or `#assign_attributes`. Even the `Reviewable` module is using the `#update` method. It is clear that this concern is only to be used with ActiveRecord classes. We could fight against ActiveRecord but a nice workaround is to embrace it and define `FakeReviewable` class as one like so:

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ApplicationRecord
  self.table_name = 'posts'

  include Reviewable
end

describe FakeReviewable do
  it_behaves_like 'reviewable' do
    let(:reviewable) { FakeReviewable.create }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

### Concerns and Database Integrity

We could stop here and move on to write the scope tests but there is one big problem with this. More often than not, models like `Post` have further validation rules even in their database table. Let's imagine a scenario like this one:

~~~ruby
# create_table "posts", force: :cascade do |t|
#   t.datetime "reviewed_at"
#   t.string "title", null: false
#   t.bigint :author_id, null: false
# end

# add_foreign_key "posts", "authors"

class Post < ApplicationRecord
  include Reviewable

  belongs_to :author

  validates :title, presence: true
end
~~~
{: data-target="code-highlighter.ruby"}

We now need to give our shared examples a valid `reviewable` record or the tests won't pass anymore. We update our code like so:

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable' do
    let(:reviewable) { Post.create(title: 'title', author: Author.build) }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ApplicationRecord
  self.table_name = 'posts'

  include Reviewable
end

describe FakeReviewable do
  it_behaves_like 'reviewable' do
    let(:reviewable) { FakeReviewable.create }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

But this will still not work, as `FakeReviewable` class is attached to the `posts` database table and it still requires `:title`, and `:author` to be populated. It almost feels like we need a dedicated table for `FakeReviewable` class...

### Switching to Temporary Database Tables

In an ideal world, we would need a `fake_reviewables` table with a single `reviewed_at` columns so that we remove the need for `title` and `author_id` to be populated. One way to do this, is to create a dedicated `fake_reviewables` testing table in your `schema.rb` but that table will also end up in your production database.

While we could argue that this is no big deal and there is nothing wrong in having testing tables in production, I'll end this article with some code on how to switch to a in memory SQLite `fake_reviewables` table.

One way to do this is to include helpers to switch to a in memory database. Here is the `InMemoryDatabaseHelpers` module and its usage with `FakeReviewable`.

~~~ruby
module InMemoryDatabaseHelpers
  extend ActiveSupport::Concern

  class_methods do
    def switch_to_SQLite(&block)
      before(:all) { switch_to_in_memory_database(&block) }
      after(:all) { switch_back_to_test_database }
    end
  end

  private

  def switch_to_in_memory_database(&block)
    raise 'No migration given' unless block_given?

    ActiveRecord::Migration.verbose = false
    ApplicationRecord.establish_connection(adapter: 'SQLite3', database: ':memory:')
    ActiveRecord::Schema.define(version: 1, &block)
  end

  def switch_back_to_test_database
    ApplicationRecord.establish_connection(ApplicationRecord.configurations['test'])
  end
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable' do
    let(:reviewable) { Post.create(title: 'title', author: Author.build) }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

And finally the solution described in the TL;DR

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ApplicationRecord
  include Reviewable
end

describe Reviewable do
  include InMemoryDatabaseHelpers

  switch_to_SQLite do
    create_table :fake_reviewables do |t|
      t.datetime :reviewed_at
    end
  end

  describe FakeReviewable, type: :model do
    include_examples 'reviewable' do
      let(:reviewable) { FakeReviewable.create }
    end
  end
end
~~~
{: data-target="code-highlighter.ruby"}

## Food for thoughts

### What about testing the scopes?

The article is quite long already the same priciples would apply to test scopes. If you're interested in a fully working spec suite, here is a GIST.

### Tests are fast

Tests run on a in memory `SQLite` test database are really fast, faster than using MySQL or PostgreSQL to test your application.

Add benchmark

### Cost of switching

I have not benchmarked / profiled the cost of switching database connections during tests. Our current test suite time doesn't seem to have been impacted.

I love Minitest but I am not aware of a standard method to run expensive task before a group of test like RSpec does with `before(:all)` .

If switching connection and instantiating an in memory database is a significant perfomance issue, some investigation is required when using Minitest and switching before every single test requiring a temporary database.

### Raw SQL queries and database syntax

SQL syntax is shared across the mainstream databases and thanks to Rails the SQL is also abstracted in a DSL.

This method of testing concerns will work for most of the use cases, however, concerns introducing raw SQL queries will be a problem. Raw SQL queries can use different syntax between MySQL, SQLite or PostgreSQL. For example, PostgreSQL has a specific syntax for window functions like `OVER (PARTITION BY x)` which I think doesn't exist in SQLite.

In this case, another testing approach would be required for that specific concern. Hopefully, raw SQL are the exception and not the standard in your Rails codebase.

### Rails 6 & Delegated Types

I'm using this with Rails 5.2 but I wonder whether Delegated Types could help testing concerns too.

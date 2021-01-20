---

title: Testing ActiveRecord Concerns
date: 2021-01-14 10:00 UTC
description: This article outlines how I test Rails concerns used on ActiveRecord models
tags: Rails, ActiveRecord, Concerns, Testing

---

{::options parse_block_html="true" /}

<small style="float:right;"> _14January 2021_ </small>

# Testing Rails Concerns

ActiveRecord classes manage persistence and have a tight relationship with the database table they're assigned to. This relationship makes testing sometimes tricky and even trickier when testing Rails concerns. This article will describe how to isolate a concern and test it in complete isolation from both the model class it has been introduced and its related database table by switching to a temporary in memory sqlite table.

The code examples are written using RSpec and switching to Minitest is possible but requires a fair bit of work.

## What are concerns?

Concerns are the Rails way to add a role to a Ruby class. It provides a nicer syntax than Ruby on how to include modules and aims to clarify confusion around depedencies and inclusiong of nested modules. Here is the [documentation](https://api.rubyonrails.org/v6.1.0/classes/ActiveSupport/Concern.html).

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

## Testing

### Concerns and their interface

In OOP, to successfully test a role you need to define and test its public interface and Rails concerns are no exception. Because it is included in the Post model, we start by writing the interface tests in the `post_spec.rb` file.

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

A role/concern is meant to be shared with other Ruby classes. Currently, Reviewable is only included in the Post model but nothing stops us from including it in other classes, especially testing classes. To do so we extract the role tests into `shared_examples` and include those in the `post_spec.rb` file and a `reviewable_spec.rb` file like so:

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
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable'
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
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

One problem with this test is that while `Post` and `FakeReviewable` share the same interface, they do not share the same behaviour. More importantly that behaviour is tight to the existence of a table column `reviewed_at:datetime` hooked to the Ruby class. Let's start by adding more tests.

~~~ruby
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
    subject { described_class.create(reviewed_at: reviewed_at).reviewed? }

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
    let(:reviewable) { described_class.new }

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
  it_behaves_like 'reviewable'
end
~~~
{: data-target="code-highlighter.ruby"}

While this causes no problem for our `Post` class, our `FakeReviewable` class is now in trouble. Few methods in the tests are now referring to ActiveRecord behaviours such as `#reload` or `#create`. Even the `Reviewable` concern is using the `#update` method. It is clear that this concern is only to be used with ActiveRecord classes. Eventhough we could fight against ActiveRecord and define methods to make tests pass, a nice workaround is to embrace ActiveRecord and defined `FakeReviewable` class as one like so:

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ApplicationRecord
  self.table_name = 'posts'

  include Reviewable
end

describe FakeReviewable do
  it_behaves_like 'reviewable'
end
~~~
{: data-target="code-highlighter.ruby"}

### Concerns and Database Integrity

We could stop here and move on to write the scope tests but there is one big problem with this. `Post` model more often than not has further validation rules or is hooked to a table with other columns set to `null: false`. Let's imagine a scenario like this one:

~~~ruby
# create_table "posts", force: :cascade do |t|
#   t.datetime "reviewed_at"
#   t.string "title", null: false
#   t.bigint "author_id", null: false
# end

class Post < ApplicationRecord
  include Reviewable

  belongs_to :author

  validates :title, presence: true
end
~~~
{: data-target="code-highlighter.ruby"}

We now need to give the `shared_examples` a valid `reviewable` record or the tests won't pass anymore. We update our code like so:

~~~ruby
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
    subject { reviewable.update(reviewed_at: reviewed_at).reviewed? }

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

But this will still not work, as `FakeReviewable` class is attached to the `posts` table and the table still requires `:title`, and `:author` to be populated. It is almost like we need dedicated table for `FakeReviewable` class.

### Switching to Temporary Database Tables

In an ideal world, we would need a `fake_reviewables` table with a single `reviewed_at` columns so that we remove the need for `title` and `author_id` to be populated. One way to do this, is to create a dedicated `fake_reviewables` testing table in your `schema.rb` but that table will also end up your production database.

While you could argue that this is not a big problem and there is nothing wrong in having testing tables in a schema.rb file, I'll end this article with a code to switch to a in memory sqlite `fake_reviewables` table. One way to do this is to include helpers to switch to a in memory database. Here is the `InMemoryDatabaseHelpers` module and its usage with `FakeReviewable`.

~~~ruby
module InMemoryDatabaseHelpers
  extend ActiveSupport::Concern

  class_methods do
    def switch_to_sqlite(&block)
      before(:all) { switch_to_in_memory_database(&block) }
      after(:all) { switch_back_to_test_database }
    end
  end

  private

  def switch_to_in_memory_database(&block)
    raise 'No migration given' unless block_given?

    ActiveRecord::Migration.verbose = false
    ActiveRecord::Base.establish_connection(adapter: 'sqlite3', database: ':memory:')
    ActiveRecord::Schema.define(version: 1, &block)
  end

  def switch_back_to_test_database
    ActiveRecord::Base.establish_connection(ActiveRecord::Base.configurations['test'])
  end
end
~~~
{: data-target="code-highlighter.ruby"}

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

class FakeReviewable < ActiveRecord::Base
  include Reviewable
end

describe Reviewable do
  include InMemoryDatabaseHelpers

  switch_to_sqlite do
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

~~~ruby
require_relative 'path/to/reviewable/shared/examples'

describe Post do
  it_behaves_like 'reviewable' do
    let(:reviewable) { Post.create(title: 'title', author: Author.build) }
  end
end
~~~
{: data-target="code-highlighter.ruby"}

## Conclusion

The article starts to be really long but the same priciples apply to test scopes. Here is a gist of the full spec suite.

### PROS

#### Decoupling

Switching to an isolated table to test concerns ensure that concerns are decoupled from the first ActiveRecord class they've been introduced into, `Post` in this example. If you're unable to isolate the interface and the public methods into a seperate test class then concern role is not understood enough, correctly defined or the wrong abstractions. Having the concern tested this way gives me more confidence in reusing the `Reviewable` with any ActiveRecord class that has a `reviewed_at:datetime` column in its table.

#### Fast

Switching to `sqlite` as an in memory test database is really fast, faster than using the same production database type like MySQL or PostgreSQL to test your application. Introducing a `sqlite` in memory test database on a new Rails project can be a good idea although I have not tested this on a current project. Switching to a temporary sqlite database can be done on existing Rails projects which is nice.

### CONS

#### Cost of switching

I have not benchmarked/profiles the cost of switching database connections during tests. Our current test suite time doesn't seem to have been impacted.

Also RSpec allows to switch connections between a group of specs which Minitest does not. I am not aware of a standard method to run expensive task before a group of test with Minitest. Some investigation are required to know whether a test suite using minitest would introduce performance issue when switching database connection at the beginning of every single test requiring a temporary table.

#### Raw SQL queries and database syntax

SQL syntax is shared across the mainstream database types like mysql, sqlite and postgresql and thanks to Rails the SQL is also abstracted in a DSL that allows to use most of the database types. This method of testing concerns will work for most of the use cases. However, concerns introducing raw SQL queries will be a problem as there could be different syntax between mysql and sqlite or postgresql and sqlite. for example, Postgresql has specific syntax for window functions like `OVER (PARTITION BY x)` that would make it harder to text concerns as sqlite does not have this feature.







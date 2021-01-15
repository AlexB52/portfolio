---

title: Testing ActiveRecord Concerns
date: 2021-01-14 10:00 UTC
description: This article outlines how I test Rails concerns used on ActiveRecord models
tags: Rails, ActiveRecord, Concerns, Testing

---

{::options parse_block_html="true" /}

<small style="float:right;"> _14January 2021_ </small>

# Testing ActiveRecord Concerns

This article describes a way to test your concerns in isolation from the class they are included in. It will focus on ActiveRecord concerns because those classes have a tight relationship with the database and can make it hard to in isolation.

The article will 

## What are concerns?

Concerns are the Rails way to add a role to a Ruby class. Rails provides by default two folders: `app/controllers/concerns` and `app/models/concerns` to nudge you on where they should belong.


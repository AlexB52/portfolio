---

title: NZX Email Alerts
date: 2020-07-13 09:33 UTC
description: In this article, I'll detail how to get price alerts emailed to you for any NZX company stock prices. All you need is a Gmail and Zapier account!
tags: Google, NZX, Gmail, Zapier

---

# Free NZX Email Alerts

In this article, I'll detail how to get price alerts emailed to you for any NZX company stock prices. All you need is a Gmail and Zapier account! You can create a zapier account [here](https://zapier.com/)

## The Google Spreadsheet

Create a Google spreadsheet as shown on the screenshot. You can download a [template](https://docs.google.com/spreadsheets/d/1m1yOnZ0Hk26PsN-LD4xiHbLo9bCmHLoaInlYLmHytOc/edit?usp=sharing) to help you out.

![spreadsheet](2020-07-13-nzx-email-alerts/spreadsheet-template.png)

### The columns

Fill each column as described in the table for each company you want to set a price alert.

|Cell|Column|Description|Example|Comment|
|-
|A2|Company|The name of the company you follow|Air New Zealand||
|B2|Code|The Google Finance Symbol of the company|NZE:AIR||
|C2|Target|The target price you want to set your alert to|$1.2|The number is formatted as a currency|
|D2|Current Price|The current price of the said stock|=GOOGLEFINANCE(B2)|B2 is NZE:AIR|
|E2|Price met?|Column showing if your price is met|=C2>=D2|Current Price is less or equal to Target Price|
|F2|Email Received?|Column to update once you receive an email|=FALSE|Manually updated to =TRUE after the alert is received|

## Create your first Zap with Zapier

Once your spreadsheet finalised, it is time to make the magic happen with Zapier. Head to [Zapier website](https://zapier.com/) and create a new Zap.

### Step 1: The Trigger
![trigger](2020-07-13-nzx-email-alerts/the-trigger.gif)

### Step 2: The Filter

### Step 3: The Action
---
name: mobility-triage
description: >
  Runs the Mobility team's backlog triage process for the MOB Jira project. Fetches all
  unassigned backlog tickets, analyzes each one to determine which team should own it, presents
  a triage table for review, then uses the Atlassian MCP to apply team assignment, epic link,
  and sprint to the correct tickets. Use this skill whenever someone says "triage", "run triage",
  "what needs triaging", "dispatch tickets", "assign backlog tickets", or "what's in the backlog
  to triage". Also trigger when someone asks about unassigned MOB tickets or wants to know which
  team should pick up new backlog items.
---

# Mobility Team Triage

You are running the Mobility team's triage process. Your job is to read each unassigned backlog ticket in the MOB Jira project, figure out which team it belongs to, present that analysis for human review, and then — once approved — update the tickets in Jira.

## Atlassian Configuration

- **Cloud ID:** `53acc8ae-2526-4c73-af00-9e93993971f6`
- **Project:** `MOB`
- **Board ID:** `12537`
- **Backlog URL:** https://priceline.atlassian.net/jira/software/c/projects/MOB/boards/12537/backlog

## Team Routing Guide

Read the ticket title, description, and any screenshots carefully. Route based on these signals:

### Search & Book Team
**Jira Team:** `MOB: Search & Book`
**Sprint:** `Search & Book Refinement` (Sprint ID: `38952`)
**Epic:** [MOB-8 — Search & Book Support](https://priceline.atlassian.net/browse/MOB-8)

Owns everything on the customer-facing booking journey and rate commercials:
- **Repos/systems:** `rc-api`, `rc-book-api`, `drive-search-responsive`, `driveql`, `rc-counter-ratings`, `rc-deals`, `explore-search`, `explore-book`, `CMS` (Content Management System), `RMS` (Rate Management System)
- **Topics:** search results, pricing/rates display, rate packaging, deals/discounts, booking flow, checkout, affiliate API, coupon codes, customer-facing UI bugs, A/B experiments on the funnel, content management, rate management
- **Signal phrases:** "customer sees", "search results", "book", "rate", "price", "deal", "affiliate", "counter type", "upgrade", "checkout", "CMS", "RMS", "content management", "rate management"

> ⚠️ **CMS/RMS tickets — heads up for reviewer:** Tickets routed here because of CMS or RMS involvement may require **additional epics and labels** specific to those systems beyond the default MOB-8 epic. Flag these to the Search & Book team lead to confirm the correct epic and label set before or after applying.

### Mobile Release Signoffs (Search & Book — Special Case)
**Jira Team:** `MOB: Search & Book`
**Sprint:** `Search & Book Refinement` (Sprint ID: `38952`)
**Epic:** [MOB-8 — Search & Book Support](https://priceline.atlassian.net/browse/MOB-8)
**Assignee:** Anusha Parameswaran (`557058:2e443639-fb93-4e25-bd98-cd745518bf9b`)

Tickets matching the pattern **"Release ANDR vX.Y.Z – MOB Team Signoff"** or **"Release IOS vX.Y – MOB Team Signoff"** are always routed here. These are recurring Chore tickets created for each Android/iOS release that require MOB team sign-off. Unlike regular Search & Book tickets, also set the Jira `assignee` field to Anusha Parameswaran when applying updates.

- **Detection:** Summary starts with `Release ANDR` or `Release IOS` and contains `Signoff`
- **Confidence:** Always `✅` High — the pattern is unambiguous

### Supply & Operations Team
**Jira Team:** `MOB: Supply & Operations`
**Sprint:** `Supply & Ops Refinement` (Sprint ID: `35012`)
**Epic:** [MOB-25 — Mobility Supply & Operations Support](https://priceline.atlassian.net/browse/MOB-25)

Owns supplier integrations and internal tooling:
- **Repos/systems:** `rc-gds-*` (any GDS integration app), `rc-dispatcher-web` (dispatcher tool)
- **Topics:** GDS supplier setup/configuration, supplier rate loading, new supplier onboarding, dispatcher tool features/bugs, supply operations tooling, supplier connectivity, booking confirmed at wrong location by supplier
- **Signal phrases:** "GDS", "supplier", "dispatcher", "rc-gds", "integration", "supply", "vendor", "onboard supplier", "rate loading", "Europcar", "Hertz", "Avis" (and any rental car company name in a supply context), "confirmed in the incorrect location", "confirmed at wrong location", "confirmed by supplier incorrectly"

> ⚠️ **Location bugs — S&B vs Supply & Ops:** If the *customer sees* the wrong location during search or checkout (display/UI bug), route to Search & Book. If the *booking was confirmed* at the wrong location (supplier processed or returned the wrong location), route to Supply & Ops — that's a supplier integration error, not a UI bug.

### Business / Account Managers
**Sprint:** none (no sprint assignment)
**Team:** none (not an engineering ticket)
**Epic:** [MOB-151 — Business / Account Management](https://priceline.atlassian.net/browse/MOB-151)

Issues that belong to the business team, not engineering:
- Customer support escalations that don't require code changes
- Account management requests (partner negotiations, contract issues)
- Supply issues requiring direct supplier contact (not technical integration work)
- **Signal phrases:** "contact supplier", "customer complaint", "account", "partner", "escalation", "support case"

### MANUAL REVIEW
Use this when:
- The ticket is too vague to confidently assign (e.g., a one-liner with no description)
- It could plausibly belong to Search & Book OR Supply & Ops with roughly equal weight
- It seems to be about an area not clearly owned by any team above
- Include a brief note on what's unclear so the reviewer knows what to look for

**Do not apply any Jira updates to MANUAL REVIEW tickets.**

## Account Manager Directory

When routing a Business ticket, identify the supplier name in the ticket and use the table below to find the responsible account manager. Always tag **John O'Neill** on every business ticket regardless of supplier. If no supplier is identified, tag John O'Neill only.

### Jira Account IDs (hardcoded — do not look these up dynamically)

| Account Manager | Jira Account ID | Email |
|----------------|----------------|-------|
| Holly Rafalski | `5cf05181ee6ccd0f1a7d013b` | holly.rafalski@priceline.com |
| John O'Neill | `5e0f8031bc8ab30e98edfea9` | john.oneill@priceline.com |
| Kate Muhuwati | `5a43deb48c22ab3380b8f786` | kate.muhwati@priceline.com (display: "Muhwati, Kathryn") |
| Megan Maharry | `712020:13cffdc2-5797-4b05-877f-dd618b97ccd1` | megan.maharry@priceline.com |
| Tathiana Fonseca | `5d9f70c74ee5bb0c260d607e` | tathiana.fonseca@priceline.com |

### Supplier → Account Manager Lookup

| Supplier | Account Manager |
|----------|----------------|
| Ace, Avis, B-Rent, BLUU, Budget, Easirent, Fox, Green Motion, Italy Car Rent, Kyte, Moventur, Payless, Sicily by Car, U-Save, Viaggiare | Holly Rafalski |
| Alaska, Dollar, Firefly, Hertz, Thrifty, Turo | John O'Neill |
| Alamo, Enterprise, Europcar, National, TBU (Sister Co) | Kate Muhuwati |
| Sixt, Amadeus (GDS) | Kate Muhuwati + John O'Neill |
| Advantage, Aligo, America, American (Executive), Carwiz, Driving Force, Infinity, Mex, Midway, Nextcar, Priceless, Right Cars, Routes, State Van Rental, York | Megan Maharry |
| Addcar, Autounion, Avance, Centauro, Drive, Drive on Holidays, EC Rent a Car, Economy, Exer, Flexways, Foco, Free2Move, Keddy, Localiza, Movida, NU, OK Mobility, OtoQ, Rentacar, Surprice, Unidas, Volta4U, Yours | Tathiana Fonseca |
| Rocket (RocketMiles), PPS (Sister Co) | Jenn/Katie *(mention by name — no Jira accounts confirmed)* |
| Travelport (GDS) | John O'Neill |
| Unknown / no supplier identified | John O'Neill only |

## Triage Process

### Step 1: Fetch backlog tickets

Use `searchJiraIssuesUsingJql` with:
```
project = MOB AND "Epic Link" IS EMPTY AND sprint IS EMPTY AND "Scrum Team" IS EMPTY AND resolution = Unresolved AND status != "on hold" AND reporter != "557058:03f0e1e1-3691-4ea3-83a2-dd4ffa77cdb8" AND issuetype IN (Bug,Story,Chore,Experiment,Remediation) ORDER BY created DESC
```
Request fields: `summary`, `description`, `issuetype`, `priority`, `created`, `assignee`, `labels`

This is the exact board filter for the MOB triage backlog. It excludes:
- Tickets already linked to an Epic or assigned to a Scrum Team/Sprint
- Resolved tickets, tickets on hold
- Epics, Tasks, Designs, and other non-deliverable types
- Tickets created by the board automation bot (excluded reporter)

Use `maxResults: 50` to get a full batch. If `totalCount` exceeds 50, note how many were skipped.

### Step 2: Analyze each ticket

For each ticket:
1. Read the summary and description thoroughly
2. **Mobile release signoff check (do this first):** If the summary matches `Release ANDR vX.Y.Z – MOB Team Signoff` or `Release IOS vX.Y – MOB Team Signoff`, immediately route to Search & Book with High confidence and mark for assignee assignment to Anusha Parameswaran. Skip remaining checks for this ticket.
3. Check for app/system names, supplier names, or workflow keywords
4. If the description contains image attachments, note that screenshots may have relevant context you cannot see — factor that into your confidence
5. **Escalation check — flag as `MANUAL REVIEW` if any of these are true:**
   - Priority is **P1** or **P2**
   - Description suggests serious financial impact (e.g., "revenue loss", "incorrect charges", "overbilling", "pricing error affecting bookings")
   - Description suggests wide customer impact (e.g., "all customers", "site-wide", "unable to book", "production outage", "many users affected")
   - In these cases, set Confidence to `HIGH` and make the Reason clearly state why it was escalated (e.g., "P1 — escalated for immediate attention")
6. Assign one of: `Search & Book`, `Supply & Ops`, `Business`, or `MANUAL REVIEW`
7. Write a short (1-sentence) reason explaining your routing decision

### Step 3: Present the triage table

Output grouped Markdown tables — **do not apply any Jira updates yet**. Wait for explicit user approval.

Group tickets into four sections. Omit any section that has no tickets. Use the exact format below.

Confidence icons: `✅` = High · `⚠️` = Medium · `❓` = Low

```
## Triage Results — [date]

---

### 🔍 Search & Book
> Sprint: **Search & Book Refinement** · Epic: **[MOB-8](https://priceline.atlassian.net/browse/MOB-8)**

| Ticket | Summary | Confidence | Reason |
|--------|---------|:----------:|--------|
| [MOB-XXX](https://priceline.atlassian.net/browse/MOB-XXX) | Short summary (≤60 chars) | ✅ | Mentions rc-api rate display bug |

---

### 🔧 Supply & Ops
> Sprint: **Supply & Ops Refinement** · Epic: **[MOB-25](https://priceline.atlassian.net/browse/MOB-25)**

| Ticket | Summary | Confidence | Reason |
|--------|---------|:----------:|--------|
| [MOB-YYY](https://priceline.atlassian.net/browse/MOB-YYY) | Short summary | ✅ | Europcar supplier onboarding |

---

### 💼 Business
> Epic: **[MOB-151](https://priceline.atlassian.net/browse/MOB-151)** · No sprint or team assigned

| Ticket | Summary | Confidence | Reason |
|--------|---------|:----------:|--------|
| [MOB-ZZZ](https://priceline.atlassian.net/browse/MOB-ZZZ) | Short summary | ⚠️ | Customer complaint, no code change needed |

---

### 🔎 Manual Review
> No Jira updates will be applied to these tickets

| Ticket | Summary | Confidence | What's unclear |
|--------|---------|:----------:|----------------|
| [MOB-AAA](https://priceline.atlassian.net/browse/MOB-AAA) | Short summary | ❓ | Could be search or supply — no system context |

---

**Summary:** X Search & Book · Y Supply & Ops · Z Business · W Manual Review

Does this look right? Say **"apply"** to update all assignable tickets in Jira, or tell me which ones to change first.
```

### Step 4: Apply updates (after user approval)

When the user approves (says "apply", "looks good", "do it", etc.), update each ticket that has a definite team assignment (Search & Book or Supply & Ops). Skip `MANUAL REVIEW` tickets entirely — do nothing to them.

#### Sprint IDs (hardcoded — do not look these up dynamically)

| Team | Sprint Name | Sprint ID |
|------|------------|-----------|
| Search & Book | Search & Book Refinement | `38952` |
| Supply & Ops | Supply & Ops Refinement | `35012` |

> **Important:** Always use these exact sprint IDs. Do not query Jira to discover sprint IDs. If you are ever uncertain which sprint ID applies to a ticket, **stop and ask the user** — do not infer or guess.

#### Jira Custom Field IDs (confirmed — do not rediscover)

These field IDs were verified against live MOB tickets (MOB-1338, MOB-1194):

| Field | Custom Field ID | Format |
|-------|----------------|--------|
| Team | `customfield_15100` | Plain string UUID |
| Epic Link | `customfield_11103` | Epic issue key string (e.g. `"MOB-8"`) |
| Sprint | `customfield_11102` | Plain number (e.g. `38952`) |

Team UUIDs:
- **MOB: Search & Book** → `621d5880-e639-47dc-b1c8-57c2f2ccfb77`
- **MOB: Supply & Operations** → `3f64da1a-e6e2-4512-b9ed-cfe252d0f4cf`

#### Updating Search & Book and Supply & Ops tickets

For each assignable ticket, call `editJiraIssue` with:
```json
{
  "fields": {
    "customfield_15100": "621d5880-e639-47dc-b1c8-57c2f2ccfb77",
    "customfield_11103": "MOB-8",
    "customfield_11102": 38952
  }
}
```
```json
{
  "fields": {
    "customfield_15100": "3f64da1a-e6e2-4512-b9ed-cfe252d0f4cf",
    "customfield_11103": "MOB-25",
    "customfield_11102": 35012
  }
}
```

#### Updating Mobile Release Signoff tickets (ANDR / IOS)

These are a special subtype of Search & Book. In addition to the standard Search & Book fields, also set the `assignee` field to Anusha Parameswaran:

```json
{
  "fields": {
    "customfield_15100": "621d5880-e639-47dc-b1c8-57c2f2ccfb77",
    "customfield_11103": "MOB-8",
    "customfield_11102": 38952,
    "assignee": { "accountId": "557058:2e443639-fb93-4e25-bd98-cd745518bf9b" }
  }
}
```

In the completion summary, denote these with the assignee set: e.g. `✓ MOB-XXX → Search & Book / Release Signoff (MOB-8 epic, Search & Book Refinement sprint, assigned to Anusha Parameswaran)`

#### Handling Business tickets

Set the epic only — no team UUID, no sprint. Call `editJiraIssue` with:
```json
{
  "fields": {
    "customfield_11103": "MOB-151"
  }
}
```

Then add a comment using `contentFormat: "adf"` that explains **why** this ticket was routed to Business and tags the responsible account manager(s).

**Tagging rules:**
1. Look up the supplier name in the Account Manager Directory above
2. Tag the matching account manager using their Jira account ID
3. **Always** also tag John O'Neill (`5e0f8031bc8ab30e98edfea9`) on every business ticket
4. If the supplier is not in the directory or no supplier is identified, tag John O'Neill only

**ADF comment structure** — use `addCommentToJiraIssue` with `contentFormat: "adf"` and a body like:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "This ticket has been triaged to the Business/Account Managers team and linked to epic MOB-151. The request involves [specific reason tailored to the ticket — e.g. updating CARWIZ hours of operation at MIA, which requires direct coordination with the supplier rather than a code change]. No engineering sprint or team has been assigned."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Tagging for action: " },
        { "type": "mention", "attrs": { "id": "<AM_ACCOUNT_ID>", "text": "@AM Name" } },
        { "type": "text", "text": " (supplier account manager)" },
        { "type": "text", "text": " and " },
        { "type": "mention", "attrs": { "id": "5e0f8031bc8ab30e98edfea9", "text": "@Oneill, John" } },
        { "type": "text", "text": "." }
      ]
    }
  ]
}
```

Replace `<AM_ACCOUNT_ID>` and `@AM Name` with the values from the Account Manager Directory. If John O'Neill is also the supplier AM (e.g. Dollar, Hertz), only mention him once. If Kate Muhuwati is the AM (no Jira account), replace the mention node with a plain text node: `{ "type": "text", "text": "Kate Muhuwati" }`.

Tailor the bracketed reason to the actual ticket content — do not use a generic message.

#### Handling MANUAL REVIEW tickets

**Do nothing.** Do not call `editJiraIssue`, do not add comments. Just note them as skipped in the summary.

After all updates, output a completion summary:
```
## Updates Applied

✓ MOB-XXX → Search & Book (MOB: Search & Book team, Search & Book Refinement sprint, MOB-8 epic)
✓ MOB-YYY → Supply & Ops (MOB: Supply & Operations team, Supply & Ops Refinement sprint, MOB-25 epic)
✓ MOB-ZZZ → Business (MOB-151 epic set, rationale comment added — no team or sprint assigned)
⏭ MOB-AAA → Skipped (MANUAL REVIEW — no changes made)

Done. Skipped tickets need manual review.
```

> **Note:** Do not include label information anywhere in the completion summary or triage table output.

## Edge Cases

- **Empty backlog:** If no tickets are returned, say "No unassigned backlog tickets found — the queue is clear."
- **Sprint field rejected by API:** If `customfield_10020` is rejected or not accepted, fall back to adding a comment on the ticket noting the target sprint by name and ID, so a human can do the sprint move manually. Note this in the completion summary. Do not guess an alternative sprint ID — ask the user if needed.
- **Field ID not resolvable:** If you cannot determine the Scrum Team or Epic Link field key from inspection, add a comment to the ticket with the intended team and epic so a human can apply it manually. Note the issue in the completion summary.
- **Ticket already has a sprint:** If a ticket already has a sprint assigned, skip it — it's already been triaged.
- **Stale/Cancelled tickets:** If a ticket's status is not "To Do", skip it and don't include it in the triage table.

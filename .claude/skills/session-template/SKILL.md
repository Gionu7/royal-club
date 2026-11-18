---
name: session-template
description: Add or change a ready-made training session template (for an age group, with a planned length) in the Royal Club app. Use when the user wants a new standard session such as "U8 45 minutes", wants a template's blocks changed, or wants the starter session changed.
---

# Session templates

Templates are in `TEMPLATES` in `js/library.js`, youngest first. Coaches see them under *Sessions → Start from a template* (admins only in club mode) and get their own copy.

```js
{
  id: 'u8-60',                         // stable; plans remember it as templateId
  name:  { en: 'U8 · 60 min · Turning', ro: 'U8 · 60 min · Întoarceri' },
  team: 'U8',                          // drives the age filter in the picker and the coaching reminders
  target: 60,                          // planned minutes; must equal the sum of the blocks
  focus: { en: '…', ro: '…' },
  blocks: [ ['free-dribble', 5], ['water-break', 2], /* [activityId, minutes] */ ],
}
```

Rules:
- Name format is `<age range> · <minutes> min · <theme>`. The template card shows the first part as its label and the part after the second `·` as its title.
- Every block id must exist in `LIBRARY`, and the activity's `ages` should include the template's age.
- Put a water break roughly every 15–20 minutes (`water-break`, 2 min). Start with an arrival/warm-up activity, end with a `cooldown`.
- Young groups (U5–U8): short blocks, lots of games, no lines. Older groups (U9–U12): technique leading into a game, a real match at the end.
- The `u7-60` template is the club's own PDF plan and seeds a new one-device install (`SAMPLE_PLAN`). Don't change its blocks unless the user asks.
- Plans made from a template follow the app language as long as the coach hasn't renamed them (`relocalize` in `js/store.js` matches the exact template texts). Changing a template's wording means old copies stop switching language. That's fine, but say so.

Check: `npm test` (it verifies every template's block ids, that the minutes add up to `target`, and both languages). Then open it in the app: *Sessions → template → Print / PDF*.

---
name: romanian-text
description: Write or review Romanian text in the Royal Club app (interface strings, activity descriptions, coaching points, templates, printed plans) and check that nothing shows in English. Use whenever adding or changing any user-facing text, or when the user says something is not in Romanian.
---

# Romanian in Royal Club

The club is Romanian; the app opens in Romanian unless the user picked English in Settings. Every user-facing text exists in both languages:

- Interface strings: `STRINGS.en` and `STRINGS.ro` in `js/i18n.js`, the same keys and the same `{placeholders}`. Insert new Romanian keys at the matching place in the `ro` block.
- Library, templates and reminders: `{ en, ro }` objects (`js/library.js`, `js/library-more.js`). Skill tags: English keys with Romanian names in `SKILL_RO`.
- Static text in `index.html` and `manifest.webmanifest` is Romanian.
- Text coaches type themselves is stored as typed. Don't translate user data.

## Style

- Speak to coaches with the imperative plural, like the club's PDF plan: "Driblați liber", "Opriți mingea cu talpa", "Lăudați efortul". Interface buttons use the second person singular or a verb: "Adaugă", "Salvează", "Începe antrenamentul".
- Use correct diacritics: ă â î ș ț (comma below, not cedilla ş ţ). Use Romanian quotation marks „…” in running text.
- Short and concrete. A coaching point is a few words: "Capul sus între atingeri".
- Write it the way a Romanian youth coach would say it, not as a translation of the English.

## Glossary (use these words)

| English | Romanian |
|---|---|
| session / training | antrenament |
| session plan | plan de antrenament |
| warm-up / cool-down | încălzire / revenire (category label: Final) |
| drill / game | exercițiu / joc |
| coaching points | indicații pentru antrenor |
| coach calls | comenzi |
| players (children) | copii (tab), jucători (in drills) |
| roster | lot |
| attendance | prezență |
| water break | pauză de apă |
| bibs | veste |
| cones / cone gate | conuri / poartă din conuri |
| small goal | poartă mică |
| sole / inside / outside / laces | talpa / interiorul / exteriorul labei piciorului / ristul |
| weaker foot | piciorul mai slab |
| first touch / receive | prima atingere / preluare |
| give-and-go (one-two) | un-doi |
| 3 v 3 | 3 contra 3 |
| keeper | portar |
| joker / neutral player | joker |
| build-out line | linie de construcție |
| look over the shoulder (scanning) | privire peste umăr |
| countdown (timer mode) | Timp rămas |
| stopwatch | Cronometru |
| rounds | Runde |
| trainee coach (role) | Antrenor stagiar |
| viewer (role) | Vizitator (jucător sau părinte) |

Avoid: "dă-și-du-te" (use "un-doi"), "pingele" (use "partea din față a tălpii"), "clipboard" (say what it is for).

## Check

1. `npm test`. `tests/i18n.test.js` fails on a missing Romanian string, a missing `{placeholder}`, an untranslated skill or an empty `ro` in the library.
2. `npm start`, then `node tests/e2e/romanian.cjs`. It opens a fresh install with an English browser, visits every screen, every activity and three printed plans, and lists lines containing common English words. "start" is fine: it is also Romanian ("La start", the timer's START button). Anything else it lists needs fixing.

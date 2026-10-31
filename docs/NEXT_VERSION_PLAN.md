# Socod next version plan (v1.1 and v1.2)

_31 Oct 2026 · prepared for Abdifatah Kassim, SoMeal Technologies · designed version: https://claude.ai/artifact/YKrCygTSNLfvnWGr6ig7HS_

## The idea in one line

Socod unlocks your apps when you finish a **task**. Walking was the first task. Next come prayer on time,
a page of Quran, dhikr, study and chores, chosen by you or, for children, by a parent.
Goal: the number-one discipline and focus app for Muslims, Somali first, with Arabic and English.

## What the market looks like (checked 31 Oct 2026)

| App | Kind | Yearly price | US rating | Strength | Gap Socod can use |
|---|---|---|---|---|---|
| Opal | Screen-time blocker | $99.99 ($19.99/mo, $399 lifetime) | 4.7 (89.5k) | Polished, focus score | Expensive; account required; free sessions can be ended any time |
| ScreenZen | Pause-before-open | Free, tips $5 to $40 | 4.9 (51.3k) | Free, no account | Pause by default, not a real block |
| one sec | Breathing pause | $19.99 ($6.99/mo) | 4.8 (23.7k) | Research-backed | Doesn't block; you can tap "yes" every time |
| Jomo | Scheduled blocker | $29.99 ($5.99/mo) | 4.8 (2.5k) | Squads | iPhone/Mac only, small |
| Brick | $59 physical tag | None | n/a | Real friction | Costs money; no task, no faith |
| Walk-to-unlock apps (StepScroll, Walkaway, Socky, WalkLock, Stroll) | Steps unlock apps | Free to $29.99 | about 1 rating each | On-device steps | English or European languages only; no faith, no community |
| Muslim Pro | Islamic suite | $34.99 ($12.99/mo) | 4.7 (601k) | Everything in one | Ads; tracks location and identifiers; 2020 location-data report |
| Pillars | Prayer app | about $60 to $80 (third-party listing) | n/a | Ad-free, privacy-minded | Paywalled features; no blocking |
| Quran Unlock | Read Quran after each prayer to unlock | Premium (free = 3 apps) | 4.7 (223) | Closest rival | No Somali; reviewer found wrong vowel marks in azkar |
| Qif | Locks at prayer time, unlock by marking prayer | $39.99 ($3.99/mo) | 5.0 (24) | 11 languages | No Somali; no movement |
| Pray Screen Time | Locks at prayer, read a verse | $19.99 ($6.99/mo, $2.99/wk) | 4.5 (10) | Khatmah mode | English listing; reminder and method bugs |
| Khatm | Read or recite a verse to unlock | Free, no ads | none yet | Recite to unlock | English and Indonesian only |

**What this means.** "Faith to unlock" already exists, but every rival is small (10 to 223 ratings), none speak
Somali, none join body and faith, none have a family mode, and two have accuracy or reliability complaints.
Socod is also the cheapest paid option ($4.99/year). The lane is open; it will not stay open long.

## v1.1 "Tasks" (build Nov to mid-Dec 2026)

| Feature | What it does | Better than the best rival because |
|---|---|---|
| Task picker | Each lock can be opened by any task the user switched on | Rivals offer one task; Socod lets body and faith work together |
| Pray on time | Prayer times worked out on the phone; mark "I prayed" inside the prayer window to unlock | Qif does this but has no Somali and no movement; Socod adds a gentle Fajr streak and Rest days |
| Read Quran | Read for a set time (5 or 10 minutes) from your own mushaf or app, then confirm | Avoids shipping Quran text before scholar review; built-in reader comes in v1.2 |
| Dhikr | On-screen counter for a scholar-approved set (for example after salah) | Counts and stays private; wording signed off in all three languages |
| Study and chores | Timer task (e.g. 25 minutes of homework), then confirm | Turns Socod into a general discipline app, not just fitness |
| Weight goal (optional, off by default) | Start weight, goal weight, entries in kg or lb, progress bar and chart | Requested by our first real user; kept on the phone only, never uploaded |
| Send feedback | Idea / problem / praise form | Goes to the new admin dashboard |
| Lock after Fajr | Already written and reviewed | No rival ties the lock to Fajr |

## v1.2 "Family" (build mid-Dec 2026 to mid-Jan 2027, ready before Ramadan)

| Feature | What it does | Better than the best rival because |
|---|---|---|
| Family mode | A parent picks apps and tasks for a child: homework, Quran, prayer, a walk | No Muslim rival has it; Opal and Jomo don't either |
| Built-in Quran reader | Licensed Arabic text, Somali and English translation, page goal | Only after scholar sign-off; accuracy is the promise |
| Apple Health weight (optional) | Reads body weight from Apple Health instead of typing it | Read-only, on-device, clear purpose text |
| Ramadan mode | Daily page goal to finish the Quran in 30 days, suhoor and taraweeh-aware lock times | Launch moment for Ramadan 2027 (expected around 8 Feb 2027) |
| Family challenges | Uses existing groups: a family walks and reads together | Social, private, no public leaderboard |

## Apple rules and review risks

| Area | Rule (Apple's own words where quoted) | What Socod does |
|---|---|---|
| Family mode | Family Controls: "Authorizing parental controls for a child requires approval from a parent or guardian in the same Family Sharing group." The child then cannot delete the app or sign out of iCloud. | Socod runs on the child's iPhone; the parent approves there. Prototype first: app choices are private tokens, so remote set-up from the parent's phone must be tested before we promise it. |
| Family Controls entitlement | The distribution entitlement must be requested from Apple (Socod's request: 9P29Q5NNJ9). | Confirm with Apple that the approved entitlement covers parental use (child authorization) before submitting v1.2. Claude drafts the note. |
| Kids | Kids Category apps have extra rules (no third-party analytics or ads). | Stay out of the Kids Category; Socod is for adults and families. Collect nothing about children; update the privacy policy. |
| HealthKit (weight, v1.2) | Must be for health or fitness and clear in marketing text and UI; no use for advertising; no sale; no sharing without permission; privacy policy required; may not store personal health information in iCloud. Apps can't tell if read access was denied. | Read body weight only; keep it on the phone; never upload to Supabase or iCloud; purpose strings in three languages; update App Privacy labels. |
| Weight without HealthKit (v1.1) | Health claims must be accurate. | A tracker only: no medical advice, no "lose X kg" claims, no BMI shaming, easy to hide or delete. |
| Religious content | Apple bars mean-spirited content about religion; accuracy is our own bar. | Every verse, dua, dhikr and hadith string is signed off by the scholar in Somali, Arabic and English before submission. Quran text from a recognised source with attribution. |
| Widget and extensions | Socod's earlier 2.5.1 rejection came from Screen Time code in the widget. | Keep new task code out of the widget target. |
| Subscriptions | 3.1.2 disclosures (already fixed). | Any Family plan shows price, length and cancel terms; turn on Family Sharing for the purchase if offered. |

## Effort (working days, Claude builds, founder tests on his iPhone)

| Item | Days |
|---|---|
| v1.1 task picker and engine | 4 |
| v1.1 pray on time (on-device prayer times, method choice) | 4 |
| v1.1 Quran timer, dhikr counter, study/chore timer | 5 |
| v1.1 weight goal (on-device) | 3 |
| v1.1 feedback, translations, scholar and native checks, TestFlight, review | 6 |
| **v1.1 total** | **22 (about 5 weeks)** |
| v1.2 family mode (prototype, build, test with two iPhones) | 11 |
| v1.2 Quran reader (licensed text, translations, scholar sign-off) | 6 |
| v1.2 Apple Health weight | 2 |
| v1.2 Ramadan mode and family challenges | 5 |
| v1.2 review and fixes | 4 |
| **v1.2 total** | **28 (about 6 weeks)** |

## Promotion built around the niche (no invented stats or reviews)

1. **"Fajr first, phone second."** Short videos of the morning lock lifting after Fajr and a walk.
2. **"Earn your scroll."** Walk 2,000 steps or read a page. Then scroll.
3. **"Made in Somali."** The first focus app in Somali. Diaspora creators, mosques and dugsi in the US, UK, Canada, Scandinavia.
4. **Parents:** "Homework and Quran before games." Family mode demo with a real family (with permission).
5. **Price:** less than a cup of shaah a month ($0.99) against $99.99 a year for Opal.
6. **Privacy:** no ads, no tracking, no selling data. Your worship stays between you and Allah.
7. **Ramadan 2027 challenge:** a 30-day family Quran and steps challenge using groups, launched two weeks before Ramadan.
8. **Body and soul:** "The strong believer" theme, only with the scholar-approved hadith wording in each language.

Paid ads stay on the pay-later list. The launch can run on organic short video and community partners.

## Top recommendations

1. Ship v1.1 "Tasks" with prayer, Quran time and dhikr beside walking: the one lane no rival owns in Somali.
2. Keep the weight goal on the phone only and off by default; add Apple Health reading in v1.2.
3. Make scholar sign-off a hard gate for every religious string in all three languages.
4. Build family mode for v1.2, prototype first, and confirm the entitlement scope with Apple.
5. Aim the Ramadan 2027 campaign at Somali families: "Fajr first" plus the 30-day family challenge.

## Sources

- Opal pricing and complaints: https://makerstack.co/reviews/opal-review/
- Opal, ScreenZen, Jomo, one sec prices and ratings (published by a competitor, Habit Doom; 10 Oct 2026): https://habitdoom.com/blog/opal-vs-screenzen-jomo-one-sec
- Brick: https://getbrick.com/products/brick
- StepScroll: https://apps.apple.com/app/id6757226912 · Walkaway: https://apps.apple.com/app/id6779288153 · Walk-to-unlock search results incl. Socky, WalkLock, Stroll
- Muslim Pro: https://apps.apple.com/us/app/muslim-pro-quran-prayer-times/id388389451
- Muslim app complaints overview: https://unstar.app/blog/muslim-pro-quran-majeed-athan-pillars-tarteel-quran-prayer-apps-ranked-2026
- Pillars pricing (third-party): https://subger.com/en/service/pillars-muslim-prayer
- Quran Unlock: https://apps.apple.com/app/id6754449406 · Qif: https://apps.apple.com/app/id6757913527 · Pray Screen Time: https://apps.apple.com/app/id6754165838 · Khatm: https://apps.apple.com/il/app/khatm-block-apps-with-quran/id6742319173
- Apple Family Controls: https://developer.apple.com/documentation/familycontrols and requestAuthorization(for:)
- Apple HealthKit privacy: https://developer.apple.com/documentation/healthkit/protecting-user-privacy
- HealthKit and iCloud rule (5.1.3(ii) fragment): https://developer.apple.com/forums/thread/844150

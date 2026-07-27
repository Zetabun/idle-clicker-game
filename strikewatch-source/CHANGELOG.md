# Release history router

This file routes historical questions to detailed audits without putting all
release history into the default GPT context.

## Current line

| Build | Focus | Detailed record |
| --- | --- | --- |
| 12.120 | Mobile flow, readability and modal accessibility | `AUDIT-12.120.md` |
| 12.119 | Guided navigation `NEXT` label visibility | `AUDIT-12.119.md` |
| 12.118 | Mobile typography readability | `AUDIT-12.118.md` |
| 12.117 | Skyline Offices environment rework | `AUDIT-12.117.md` |
| 12.116 | Desktop header split | `AUDIT-12.116.md` |
| 12.115 | Header and negotiation readability | `AUDIT-12.115.md` |
| 12.114 | Compact live-feed/readability pass | `AUDIT-12.114.md` |
| 12.113 | Desktop version alignment | `AUDIT-12.113.md` |
| 12.112 | Visible version header | `AUDIT-12.112.md` |
| 12.111 | Realistic operator heads | `AUDIT-12.111.md` |
| 12.110 | Natural operator silhouettes | `AUDIT-12.110.md` |
| 12.109 | Citadel match performance | `AUDIT-12.109.md` |
| 12.108 | Citadel Depot environment rework | `AUDIT-12.108.md` |
| 12.107 | Recruitment-card surface isolation | `AUDIT-12.107.md` |
| 12.106 | Configurable management background | `AUDIT-12.106.md` |
| 12.105 | Windowed-match label cleanup | `AUDIT-12.105.md` |
| 12.104 | Blocker links, recruitment hover and portrait HUD | `AUDIT-12.104.md` |

## Historical domains

Use the indicated audit ranges, then select only the newest file relevant to
the task.

| Domain | Audit route |
| --- | --- |
| Recruitment, transfers and comparison UX | `AUDIT-12.33.md`–`AUDIT-12.34.md`, `AUDIT-12.47.md`–`AUDIT-12.51.md`, `AUDIT-12.69.md`–`AUDIT-12.97.md` |
| First Match Guide and opening week | `AUDIT-12.24.md`–`AUDIT-12.36.md`, `AUDIT-12.58.md`–`AUDIT-12.68.md` |
| Mobile/desktop navigation and readability | `AUDIT-12.60.md`–`AUDIT-12.66.md`, `AUDIT-12.78.md`–`AUDIT-12.92.md`, `AUDIT-12.104.md`–`AUDIT-12.120.md` |
| Weapons, armour and operator presentation | `AUDIT-12.08-retained.md`–`AUDIT-12.23.md`, `AUDIT-12.41.md`–`AUDIT-12.57.md`, `AUDIT-12.110.md`–`AUDIT-12.111.md` |
| Match AI, diagnostics and live command | `AUDIT-12.09.md`–`AUDIT-12.13.md`, `AUDIT-12.21.md`, `AUDIT-12.37.md`–`AUDIT-12.40.md`, `AUDIT-12.53.md`, `AUDIT-12.109.md` |
| Arenas, navigation and rendering | `AUDIT-11.99.md`, `AUDIT-12.05.md`–`AUDIT-12.07.md`, `AUDIT-12.52.md`, `AUDIT-12.108.md`–`AUDIT-12.109.md`, `AUDIT-12.117.md` |
| Economy, calendar, staff and infrastructure | `AUDIT-12.15.md`–`AUDIT-12.16.md`, `AUDIT-12.35.md`, `AUDIT-12.51.md`, `AUDIT-12.67.md`, `AUDIT-12.81.md` |

Older Build 11 records and every detailed Build 12 record remain in their
individual `AUDIT-*.md` files. Use:

```text
rg -l "keyword or function name" AUDIT-*.md
```

Do not load the full audit collection by default.

---
type: reference
last_verified: 2026-09-28
owner: aroma
---

# docs/ — reference documentation

Start at **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** to find any file in the repo.

## Live references (top level)

| Doc | Read it when |
|--|--|
| [SERVICE_DURABILITY_AND_CONTRACTS.md](SERVICE_DURABILITY_AND_CONTRACTS.md) | operating the live service: durability, tenants, deploys, freeing disk |
| [PIPELINE.md](PIPELINE.md) | you need the content pipeline end to end |
| [DEPLOYMENT_PREREQS.md](DEPLOYMENT_PREREQS.md) | what the Railway service needs before the API is turned on for another organisation |
| [QA_QUICK_REFERENCE.md](QA_QUICK_REFERENCE.md), [QA_SYSTEM_OVERVIEW.md](QA_SYSTEM_OVERVIEW.md) | rating a video |
| [HARNESS_AUDIT.md](HARNESS_AUDIT.md) | the state of the hooks, gates and smoke test |
| [CONTRACT-CHANGELOG.md](CONTRACT-CHANGELOG.md) | the API contract changed |
| [infrastructure-maintenance.md](infrastructure-maintenance.md) | maintaining CI, hooks and the daily health check |

## Folders

| Folder | Contents |
|--|--|
| `contracts/` | The versioned course-API contracts |
| `integration-requests/` | Correspondence with the LMS team |
| `guides/` | How-tos, mostly for the **legacy** Remotion stack — each carries a banner saying so |
| `archive/` | Dated status reports and superseded drafts. Historical: their paths describe the tree as it was |
| `onboarding/` | Student setup PDFs, plus `docs/onboarding/generate_setup_manual.py`, which reads them from its own folder |
| `course-materials/` | Session deliverables (`.docx` / `.pdf`) |
| `superpowers/` | Design specs |

The consumer→producer course scripts (`CONSUMER_PRODUCER_*`, `SCRIPT_*`, `VIDEO_*`) also sit at
the top level; they are course content, not reference.

Back to the map: [FILE_STRUCTURE.md](FILE_STRUCTURE.md).

---
name: wiki-maintenance
description: Maintain the project knowledge wiki in docs/wiki/. Use when adding new components, discovering patterns, answering questions from docs, or updating documentation. The wiki is an LLM-maintained knowledge base with entities, concepts, and guides.
---

# Wiki Maintenance Skill

Project knowledge base maintained by LLMs. Located in `docs/wiki/`.

## Structure

```
docs/
├── AGENTS.md          # Instructions (read this first!)
├── raw/               # Immutable source documents (read-only)
└── wiki/              # LLM-maintained wiki
    ├── index.md       # Content catalog
    ├── log.md         # Activity log
    ├── entities/      # Concrete things (classes, hooks, stores)
    ├── concepts/      # Abstract ideas (patterns, strategies)
    └── guides/        # How-to references
```

## When to Update the Wiki

| Trigger | Action |
|---------|--------|
| New component/hook/store created | Create entity page |
| New pattern discovered | Create concept page |
| New tool/workflow learned | Create guide page |
| Code changed in existing entity | Update that entity's page |
| Question answered from wiki | Log it in log.md |
| Bug fix reveals new insight | Update relevant page |

## Page Templates

### Entity Page (`entities/`)

For concrete things: components, hooks, stores, utilities.

```markdown
---
title: EntityName
type: entity
location: src/path/to/file.ts
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# EntityName

Brief description.

## Location
`src/path/to/file.ts`

## Responsibilities
- What it does
- What it owns

## Usage
```typescript
// Code example
```

## See Also
- [[RelatedPage]] — context
```

### Concept Page (`concepts/`)

For abstract ideas: patterns, strategies, architectural decisions.

```markdown
---
title: Concept Name
type: concept
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# Concept Name

What is this? Why does it matter?

## Overview
Explanation in project context.

## Implementation
How it's implemented.

## See Also
- [[EntityA]] — implements this
```

### Guide Page (`guides/`)

For how-to instructions and quick references.

```markdown
---
title: Guide Title
type: guide
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# Guide Title

What this helps you do.

## Quick Reference
Common commands/patterns.

## See Also
- [[EntityName]] — relevant entity
```

## Update Workflow

### 1. Create/Update Page

- Use proper frontmatter (title, type, created, updated, tags, related)
- Add `[[wikilinks]]` to related pages
- Include code examples from actual source
- Add `## See Also` section at bottom

### 2. Update Index

Add to `docs/wiki/index.md` under appropriate section:

```markdown
## Entities
| [[NewPage]] | Description | `location` |
```

### 3. Log the Change

Append to `docs/wiki/log.md`:

```markdown
## [YYYY-MM-DD] action | PageName

Description of what was done.
```

## Wikilink Syntax

```markdown
[[PageName]]              # Link to page
[[PageName|Display Text]] # Custom display text
```

Obsidian resolves `[[CacheManager]]` to `entities/CacheManager.md` automatically.

## Tags Convention

Use consistent tags across pages:

| Tag | Meaning |
|-----|---------|
| `solana` | Solana-related |
| `caching` | Caching/performance |
| `ui` | UI/component |
| `state` | State management |
| `zustand` | Zustand stores |
| `react` | React patterns |
| `meteora` | Meteora DLMM |
| `tools` | Development tools |

## Health Checks

Periodically check for:

1. **Orphan pages** — pages with no inbound `[[wikilinks]]`
2. **Broken links** — `[[PageName]]` with no matching page
3. **Stale content** — pages not updated after code changes
4. **Missing cross-references** — related pages not linked

## Raw Sources

Source documents in `docs/raw/` are **immutable**. Extract knowledge from them into wiki pages, but never modify the raw files.

## Related

See `docs/AGENTS.md` for detailed schema and conventions.

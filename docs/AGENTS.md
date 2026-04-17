---
title: Wiki Schema
type: schema
created: 2026-04-18
updated: 2026-04-18
tags: [wiki, schema, documentation]
---

# Wiki Schema

Instructions for the LLM on how to maintain the project wiki.

## Directory Structure

```
docs/
├── wiki/                    # LLM-maintained wiki (edit this)
│   ├── index.md            # Content catalog — update on every change
│   ├── log.md              # Chronological activity log — append only
│   ├── entities/           # Entity pages (classes, singletons, components)
│   ├── concepts/           # Concept pages (patterns, strategies, systems)
│   └── guides/             # How-to guides and quick references
├── raw/                    # Raw sources (immutable, read-only)
└── *.md                    # Legacy docs (migrate to wiki over time)
```

## Page Conventions

### Frontmatter

All pages should include YAML frontmatter:

```yaml
---
title: Page Title
type: entity|concept|guide|schema
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
related:
  - RelatedPage1
  - RelatedPage2
---
```

### Entity Pages (`entities/`)

For concrete things: classes, hooks, components, stores, utilities.

```markdown
---
title: EntityName
type: entity
location: src/path/to/file.ts
created: 2026-04-18
updated: 2026-04-18
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# EntityName

Brief description of what it is and where it lives.

## Location
`src/path/to/file.ts`

## Responsibilities
- What this entity does
- What it owns

## Key Relationships
- Depends on X
- Used by Y

## See Also
- [[RelatedEntity]] - related entity
- [[RelatedConcept]] - related concept
```

### Concept Pages (`concepts/`)

For abstract ideas: patterns, strategies, architectural decisions.

```markdown
---
title: Concept Name
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# Concept Name

What is this concept? Why does it matter?

## Overview
Explanation of the concept in project context.

## Implementation
How this concept is implemented in the codebase.

## See Also
- [[EntityA]] - implements this concept
- [[OtherConcept]] - related idea
```

### Guide Pages (`guides/`)

For how-to instructions and quick references.

```markdown
---
title: Guide Title
type: guide
created: 2026-04-18
updated: 2026-04-18
tags: [tag1, tag2]
related:
  - RelatedEntity
  - RelatedConcept
---

# Guide Title

What this guide helps you do.

## Quick Reference
Common commands/patterns.

## Detailed Instructions
Step-by-step guidance.

## See Also
- [[EntityName]] - relevant entity
- [[ConceptName]] - relevant concept
```

## Operations

### Ingest (Add/Update Content)

When adding new knowledge:

1. Identify the right page(s) to create or update
2. Create/update the page with proper frontmatter
3. Add `[[wikilinks]]` to related pages
4. Update `index.md` with the new/updated page
5. Append entry to `log.md`

### Query (Find Information)

1. Check `index.md` for relevant pages
2. Follow `[[wikilinks]]` to related content
3. Synthesize answer with citations

### Lint (Health Check)

Periodically check for:
- Orphan pages (no inbound links)
- Broken `[[wikilinks]]`
- Missing cross-references
- Stale content that needs update

## Obsidian Features

### Wikilinks

Use `[[PageName]]` for internal links:

- `[[CacheManager]]` → links to `entities/CacheManager.md`
- `[[Caching Strategy]]` → links to `concepts/Caching Strategy.md`
- `[[ast-grep]]` → links to `guides/ast-grep.md`
- `[[PageName|Display Text]]` → custom display text

### Tags

Use `#tag` in content or `tags: [tag1, tag2]` in frontmatter:

- `#caching` - caching related
- `#performance` - performance related
- `#ui` - UI related
- `#solana` - Solana related

### Graph View

The wiki is designed for Obsidian's graph view:

- Entities are hubs (many connections)
- Concepts connect entities
- Guides provide practical how-tos
- `related` in frontmatter creates implicit links

## Log Format

Each log entry should start with:

```markdown
## [YYYY-MM-DD] action | Subject

Description of what happened.
```

Examples:

- `## [2026-04-18] create | CacheManager entity page`
- `## [2026-04-18] update | Caching concept with dedup details`
- `## [2026-04-18] query | "How does request dedup work?"`

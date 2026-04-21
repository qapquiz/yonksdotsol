---
title: ast-grep Guide
type: guide
created: 2026-04-18
updated: 2026-04-18
tags: [tools, code-search, ast-grep]
related:
  - Performance Optimizations
---

# ast-grep Guide

Structural code search patterns and rules for this project.

## Quick Commands

### Find memo-wrapped components

```bash
ast-grep scan --rule .ast-grep/rules/memo-components.yml src/
```

### Find console.error calls

```bash
ast-grep scan --rule .ast-grep/rules/console-errors.yml src/
```

### Find all exports

```bash
ast-grep run --pattern 'export default $X' --lang tsx src/
```

### Find useCallback usage

```bash
ast-grep run --pattern 'useCallback' --lang tsx src/
```

### Find FlashList usage

```bash
ast-grep run --pattern '<FlashList' --lang tsx src/
```

### Find Pressable components

```bash
ast-grep run --pattern '<Pressable' --lang tsx src/
```

## Inline Rules (no file needed)

### Find async functions with await

```bash
ast-grep scan --inline-rules "id: async-await
language: tsx
rule:
  pattern: async ($$$) => { $$$ await $$$ $$$ }" src/
```

## Rule Files

Located in `.ast-grep/rules/`:

| Rule File             | Purpose                         |
| --------------------- | ------------------------------- |
| `memo-components.yml` | Find memo-wrapped components    |
| `console-errors.yml`  | Find console.error calls        |
| `async-await.yml`     | Find async callbacks with await |
| `zustand-stores.yml`  | Find Zustand store creation     |
| `flashlist.yml`       | Find FlashList usage            |

## Project Stats

- **35 TypeScript files**
- **9 memo() wrapped components**
- **2 console.error calls** (both with proper error handling)
- **1 FlashList** (positions list)
- **2 Zustand stores** (PnL, Settings)

## See Also

- [[Performance Optimizations]] — Using ast-grep to find optimization opportunities

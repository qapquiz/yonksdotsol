---
title: Connection
type: entity
location: src/config/connection.ts
created: 2026-04-18
updated: 2026-04-18
tags: [solana, rpc, singleton]
related:
  - Caching Strategy
  - PositionInfo
---

# Connection

Singleton Solana RPC connection instance used throughout the app.

## Overview

The app uses a single, lazily-initialized `Connection` instance for all Solana RPC calls. This prevents multiple WebSocket connections and inconsistent state.

## Location

`src/config/connection.ts`

## Responsibilities

- Provides the single `Connection` instance for all Solana RPC calls
- Lazy initialization on first access
- Never created multiple times

## Usage

```typescript
import { getSharedConnection } from '../config/connection'

const connection = getSharedConnection()
// Use for all RPC calls
const positions = await DLMM.getAllLbPairPositionsByUser(connection, wallet)
```

## Rules

- **Single instance** — lazy singleton via module-level `let instance`
- **All consumers import `getSharedConnection()`** — no one creates their own `new Connection()`
- **Never prop-drill Connection** through component trees
- **Never accept Connection as a component/hook prop** — call `getSharedConnection()` where needed

## Consumers

- `src/app/index.tsx` — DLMM.getAllLbPairPositionsByUser
- `src/hooks/useUpnlPerPosition.ts` — metcomet getUpnlPerPosition

## See Also

- [[Caching Strategy]] — Connection used with CacheManager
- [[PositionInfo]] — Positions fetched via Connection
- [[Connection Lifecycle]] — Deeper dive into the singleton pattern

---
title: Connection Lifecycle
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [solana, rpc, singleton, architecture]
related:
  - Connection
  - Caching Strategy
---

# Connection Lifecycle

Singleton pattern for Solana RPC connection.

## Overview

The app uses a single, lazily-initialized [[Connection]] instance for all Solana RPC calls. This prevents:

- Multiple WebSocket connections
- Inconsistent state between connections
- Wasted resources

## Flow

```
getSharedConnection()  ←  src/config/connection.ts
         │
         ├─→ src/app/index.tsx          (DLMM.getAllLbPairPositionsByUser)
         └─→ src/hooks/useUpnlPerPosition.ts  (metcomet getUpnlPerPosition)
```

## Rules

1. **Single instance** — lazy singleton via module-level `let instance`
2. **All consumers import `getSharedConnection()`** — no one creates their own
3. **Never prop-drill Connection** through component trees
4. **Never accept Connection as a prop** — call `getSharedConnection()` where needed

## Implementation

```typescript
// src/config/connection.ts
let instance: Connection | null = null

export function getSharedConnection(): Connection {
  if (!instance) {
    instance = new Connection(env.rpcUrl, 'confirmed')
  }
  return instance
}
```

## See Also

- [[Connection]] — The singleton implementation
- [[Caching Strategy]] — Connection used with CacheManager

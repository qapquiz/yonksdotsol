# Files

- [Position Data Pipeline](data-pipeline.md) - The PositionPipeline turns a raw on-chain position scan into token prices, per-pool PnL, per-position view models, and a portfolio summary — with per-stage error degradation, dependency-injection seams, and deliberate client vs server summary paths.
- [System Overview](overview.md) - How Yonks is assembled — the boot sequence outside the React tree, the root provider stack, the layered ownership boundaries (services, hooks, stores, widgets/tasks, utils), the dual Solana SDK setup and the polyfill patches it depends on, and the headless Android widget and alert surface.
- [State & Persistence](state-and-persistence.md) - Where Yonks state lives — five per-domain MMKV instances shared between the app and headless widget runs, the Zustand settings store behind persist middleware, plain-MMKV wallet and alert stores guarded by the wallet revision counter, and the in-memory CacheManager kept conceptually apart from persistence.

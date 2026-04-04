Perform a thorough code review of the provided file(s). Evaluate the following:

## Checks

1. **Type Safety** - Strict TypeScript usage, correct types, no `any` abuse, proper interface/type definitions
2. **React Best Practices** - Correct hook usage (dependency arrays, cleanup in useEffect), memo where needed, proper prop types
3. **BigInt Usage** - Token amounts use `BigInt`, correct divisor calculation with `10n ** BigInt(decimals)`
4. **Imports** - Grouped correctly (React → third-party → internal), sorted alphabetically within groups, `import type` for type-only imports
5. **Formatting** - No semicolons, single quotes, 2-space indentation, trailing commas (per Prettier config)
6. **Error Handling** - Try/catch for async ops, console.error for logging, fallback UI, error state for user feedback
7. **Styling** - Uniwind/Tailwind utility classes, correct custom colors (`app-*`), consistent patterns (rounded-3xl cards, text-sm font-bold)
8. **Performance** - useMemo for expensive computations, useCallback for passed handlers, no unnecessary re-renders
9. **Security** - No hardcoded secrets (use EXPO*PUBLIC* env vars), no unsafe operations on user input
10. **Solana-Specific** - Proper transaction handling, error codes, account validation, RPC usage patterns

## Output Format

For each issue found, provide:

- **Severity:** 🔴 Critical | 🟡 Warning | 🔵 Suggestion
- **Location:** File and line/section
- **Description:** What the issue is
- **Recommendation:** How to fix it

If no issues are found, confirm the code is clean.

Focus area (if specified): {{focus}}

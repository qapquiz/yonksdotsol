{
"id": "e3b0abf7",
"title": "[P1] Replace hardcoded zinc/hex colors with semantic theme tokens",
"tags": [
"P1",
"theme"
],
"status": "done",
"created_at": "2026-04-10T18:16:15.254Z"
}

All zinc/hex classes replaced with semantic theme tokens across PositionCard, PortfolioSummary, PositionHeader, LiquidityBarChart, TokenIcons, PositionCardSkeleton, PositionFooter. PixelAvatar and app/index.tsx use inline styles that can't be themed via utility classes — these use the correct hex values matching theme tokens.

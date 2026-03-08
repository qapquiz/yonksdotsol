# Yonks

A mobile wallet application for tracking Meteora DLMM (Dynamic Liquidity Market Maker) positions on Solana.

## Features

- Connect your Solana wallet with mobile wallet adapter
- View all your active Meteora DLMM positions
- Real-time position data including token balances and PnL
- Historical value tracking with initial deposits
- Liquidity charts with OHLCV visualization
- Optimized caching for fast load times
- Pull-to-refresh for latest position data

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

This steps builds the dependencies for the development client.

```bash
npm run android
```

In the output, you'll find options to open the app in a:
In the output, you'll find options to open the app in a:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Configuration

Set up your environment variables by copying the `.env.example` file and adding your values:

```bash
cp .env.example .env
```

Required environment variables:

- `EXPO_PUBLIC_RPC_URL` - Your Solana RPC endpoint
- `EXPO_PUBLIC_HELIUS_API_KEY` - Your Helius API key for enhanced data fetching

## Project Structure

- `/src/app/` - Expo Router pages (file-based routing)
- `/src/components/` - Reusable UI components (PositionCard, EmptyState, etc.)
- `/src/hooks/` - Custom React hooks for data fetching
- `/src/utils/` - Utility functions and calculations
- `/src/config/` - Configuration and environment variables
- `/docs/` - Comprehensive caching documentation

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Uniwind documentation](https://uniwind.dev/): Learn how to style your app with Tailwind CSS.
- [Solana documentation](https://solana.com/docs): Learn how to build on Solana.
- [Meteora documentation](https://docs.meteora.app/): Learn about DLMM and liquidity pools.

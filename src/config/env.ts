// import { z } from "zod";
//
// const envSchema = z.object({
// 	EXPO_PUBLIC_RPC_URL: z.url(),
// });
//
// const parsed = envSchema.parse(process.env);

import { Platform } from 'react-native'

export const env = {
  rpcUrl: process.env.EXPO_PUBLIC_RPC_URL,
  heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
  /**
   * Dev-only: render mock positions instead of fetching on-chain data.
   * Always enabled on web — the web target exists purely as a mock-data
   * visual preview (no wallet adapter, no RPC), so the simulator isn't
   * needed for UI iteration.
   */
  devMock: process.env.EXPO_PUBLIC_DEV_MOCK === '1' || Platform.OS === 'web',
}

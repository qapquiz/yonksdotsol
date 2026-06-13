// import { z } from "zod";
//
// const envSchema = z.object({
// 	EXPO_PUBLIC_RPC_URL: z.url(),
// });
//
// const parsed = envSchema.parse(process.env);

export const env = {
  rpcUrl: process.env.EXPO_PUBLIC_RPC_URL,
  heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
  /** Dev-only: render mock positions instead of fetching on-chain data */
  devMock: process.env.EXPO_PUBLIC_DEV_MOCK === '1',
}

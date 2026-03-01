// import { z } from "zod";
//
// const envSchema = z.object({
// 	EXPO_PUBLIC_RPC_URL: z.url(),
// });
//
// const parsed = envSchema.parse(process.env);

export const env = {
	rpcUrl: process.env.EXPO_PUBLIC_RPC_URL,
};

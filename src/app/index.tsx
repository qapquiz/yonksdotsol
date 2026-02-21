import type { PositionInfo } from "@meteora-ag/dlmm";
import DLMM from "@meteora-ag/dlmm";
import { Connection, PublicKey } from "@solana/web3.js";
import {
	createSolanaDevnet,
	useMobileWallet,
} from "@wallet-ui/react-native-kit";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function App() {
	const { account, connect, disconnect } = useMobileWallet();
	const connection = useMemo(
		() => new Connection(process.env.EXPO_PUBLIC_RPC_URL || ""),
		[],
	);
	const [positions, setPositions] = useState<Map<string, PositionInfo>>(
		new Map(),
	);

	useEffect(() => {
		const getPositions = async (connection: Connection, wallet: PublicKey) => {
			try {
				const pos = await DLMM.getAllLbPairPositionsByUser(connection, wallet);
				console.log(pos);
				setPositions(pos);
			} catch (e) {
				console.error(e);
			}
		};

		if (account?.address === undefined) {
			return;
		}

		const tempWallet = new PublicKey(
			"87bdcSg4zvjExbvsUSbGifYUp75JdLhLafjgwvCjzjkA",
		);
		// getPositions(connection, new PublicKey(account.address));
		getPositions(connection, new PublicKey(tempWallet));
	}, [connection, account?.address]);

	return (
		<View className="flex-1 bg-white dark:bg-black items-center justify-center px-8">
			{/* Heading */}
			<Text className="text-4xl font-extrabold text-gray-800 dark:text-white mb-3 tracking-tight">
				🚀 Welcome
			</Text>

			{/* Subheading */}
			<Text className="text-xl dark:text-white text-gray-700 mb-8 text-center leading-relaxed">
				Build beautiful apps with{" "}
				<Text className="text-blue-500 font-semibold">
					Expo + Uniwind + @solana/kit 🔥
				</Text>
			</Text>

			<View className="mb-8 items-center">
				{account ? (
					<View className="items-center">
						<Text className="text-gray-600 dark:text-gray-400 mb-2">
							Connected: {account.address.toString().slice(0, 8)}...
						</Text>
						<Pressable
							onPress={disconnect}
							className="bg-red-500 px-6 py-3 rounded-xl active:bg-red-600"
						>
							<Text className="text-white font-bold">Disconnect Wallet</Text>
						</Pressable>
					</View>
				) : (
					<Pressable
						onPress={connect}
						className="bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700"
					>
						<Text className="text-white font-bold text-lg">Connect Wallet</Text>
					</Pressable>
				)}
			</View>

			{/* Instruction text */}
			<Text className="text-base text-gray-600 dark:text-white text-center max-w-sm">
				Start customizing your app by editing{" "}
				<Text className="font-semibold text-gray-800 dark:text-white">
					app/index.tsx
				</Text>
			</Text>

			<StatusBar style="auto" />
		</View>
	);
}

import { Feather, Ionicons } from "@expo/vector-icons";
import type { PositionInfo } from "@meteora-ag/dlmm";
import DLMM from "@meteora-ag/dlmm";
import { Connection, PublicKey } from "@solana/web3.js";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PositionsList from "./positions";

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
				setPositions(pos);
			} catch (e) {
				console.error(e);
			}
		};

		if (account?.address === undefined) {
			setPositions(new Map());
			return;
		}

		getPositions(connection, new PublicKey(account.address));
	}, [connection, account?.address]);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#050505" }}>
			<View className="px-4 py-4">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View
							className={`h-10 w-10 items-center justify-center rounded-full ${
								account ? "bg-app-primary-dim" : "bg-app-surface-highlight"
							}`}
						>
							<Feather
								name="user"
								size={20}
								color={account ? "#8FA893" : "#999999"}
							/>
						</View>
						<View>
							<Text className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
								{account
									? `${account.address.slice(0, 4)}...${account.address.slice(-4)}`
									: "Not Connected"}
							</Text>
							<Text className="text-lg font-bold text-app-text">
								DLMM Overview
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-3">
						{/*<View className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight">
							<Feather name="bell" size={20} color="#999999" />
						</View>
						*/}
						<Pressable
							onPress={account ? disconnect : connect}
							className={`h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80 ${
								account ? "border border-app-primary" : ""
							}`}
						>
							<Ionicons
								name="wallet-outline"
								size={20}
								color={account ? "#8FA893" : "#999999"}
							/>
						</Pressable>
					</View>
				</View>
			</View>

			<ScrollView className="flex-1 px-4 pt-4">
				<PositionsList positions={positions} />
			</ScrollView>

			<StatusBar style="auto" />
		</SafeAreaView>
	);
}

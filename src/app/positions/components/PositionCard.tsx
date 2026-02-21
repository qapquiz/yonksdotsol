import type { PositionInfo } from "@meteora-ag/dlmm";
import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { fetchTokenPriceData, type TokenInfo } from "../../tokens";
import { formatTokenAmount } from "../utils/formatters";

interface PositionCardProps {
	position: PositionInfo;
}

export default function PositionCard({ position }: PositionCardProps) {
	const [tokenXInfo, setTokenXInfo] = useState<TokenInfo | null>(null);
	const [tokenYInfo, setTokenYInfo] = useState<TokenInfo | null>(null);

	useEffect(() => {
		fetchTokenPriceData(position.tokenX.mint.address.toBase58()).then((res) => {
			setTokenXInfo(res);
		});
	}, [position.tokenX.mint.address]);

	useEffect(() => {
		fetchTokenPriceData(position.tokenY.mint.address.toBase58()).then((res) => {
			setTokenYInfo(res);
		});
	}, [position.tokenY.mint.address]);

	const lbPairPosition = position.lbPairPositionsData[0];
	if (!lbPairPosition) return null;
	const { positionData } = lbPairPosition;

	// Calculate total USD value of the position
	const calculateTotalValue = (): string => {
		// Return placeholder while price data loads
		if (!tokenXInfo || !tokenYInfo) return "$0.00";

		// Convert raw amounts to bigint
		const totalXAmount = BigInt(positionData.totalXAmount);
		const totalYAmount = BigInt(positionData.totalYAmount);

		// Calculate decimal divisors
		const xDivisor = 10n ** BigInt(tokenXInfo.decimals);
		const yDivisor = 10n ** BigInt(tokenYInfo.decimals);

		// Convert to human-readable amounts
		const xAmount = Number(totalXAmount) / Number(xDivisor);
		const yAmount = Number(totalYAmount) / Number(yDivisor);

		// Calculate USD values
		const xValueUSD = xAmount * tokenXInfo.price_info.price_per_token;
		const yValueUSD = yAmount * tokenYInfo.price_info.price_per_token;

		// Sum total value
		const totalValueUSD = xValueUSD + yValueUSD;

		// Format as USD currency
		return `$${totalValueUSD.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	};

	const totalValue = calculateTotalValue();

	// Placeholders for data we don't have yet
	// In a real app, these would come from price feeds or context
	const inRange = true;
	const currentPrice = "$0.00";

	// Calculate approximate fees display (mocking USD conversion)
	// formatTokenAmount returns string, so we're just displaying raw amounts for now
	// ideally we'd multiply by price
	const feeX = formatTokenAmount(positionData.feeX, 9);
	const feeY = formatTokenAmount(positionData.feeY, 9);
	const unrealizedFeesDisplay = `${feeX} ${tokenXInfo?.symbol || "X"} / ${feeY} ${tokenYInfo?.symbol || "Y"}`;

	return (
		<View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800">
			{/* Header */}
			<View className="flex-row justify-between items-start mb-6">
				<View className="flex-row items-center gap-3">
					{/* Token Icons Placeholder */}
					<View className="flex-row">
						<Image
							className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-900 z-10"
							source={{ uri: tokenXInfo?.cdn_url }}
						/>
						<Image
							className="w-8 h-8 rounded-full bg-zinc-600 border border-zinc-900 -ml-3"
							source={{ uri: tokenYInfo?.cdn_url }}
						/>
					</View>
					<View>
						<Text className="text-white font-bold text-lg">
							{tokenXInfo?.symbol} / {tokenYInfo?.symbol}
						</Text>
						<Text className="text-zinc-500 text-xs font-medium">
							SPOT · CURVE
						</Text>
					</View>
				</View>
				<View className="items-end gap-1">
					<View
						className={`px-2 py-1 rounded-md ${inRange ? "bg-emerald-500/20" : "bg-orange-500/20"}`}
					>
						<Text
							className={`text-[10px] font-bold ${inRange ? "text-emerald-500" : "text-orange-500"}`}
						>
							{inRange ? "IN RANGE" : "OUT OF RANGE"}
						</Text>
					</View>
					<Text className="text-white font-bold text-lg">{totalValue}</Text>
				</View>
			</View>

			{/* Liquidity Distribution Chart */}
			<View className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
				<View className="flex-row justify-between mb-4">
					<Text className="text-zinc-500 text-[10px] font-bold tracking-wider">
						LIQUIDITY DISTRIBUTION
					</Text>
					<Text className="text-zinc-400 text-[10px] font-bold">
						PRICE: {currentPrice}
					</Text>
				</View>

				{/* Bars Visualization - Simulated */}
				<View className="flex-row items-end h-16 gap-1 justify-center px-4">
					{[0.2, 0.3, 0.4, 0.6, 1.0, 0.6, 0.4, 0.3, 0.2].map((height, i) => (
						<View
							key={i}
							className={`flex-1 rounded-sm ${i === 4 ? "bg-emerald-500/50" : "bg-zinc-800"}`}
							style={{ height: `${height * 100}%` }}
						/>
					))}
				</View>
			</View>

			{/* Footer / Actions */}
			<View className="flex-row justify-between items-center">
				<View>
					<Text className="text-zinc-500 text-[10px] font-bold mb-1 tracking-wider">
						UNREALIZED FEES
					</Text>
					<View className="flex-row items-center gap-1">
						<Text className="text-white font-bold text-sm">
							{unrealizedFeesDisplay}
						</Text>
						<Text className="text-emerald-400 text-xs">✨</Text>
					</View>
				</View>

				{/*
				<View className="flex-row gap-2">
					<TouchableOpacity className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
						<Text className="text-zinc-300 font-bold text-xs">CLAIM</Text>
					</TouchableOpacity>
					<TouchableOpacity className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
						<Text className="text-zinc-300 font-bold text-xs">ADD</Text>
					</TouchableOpacity>
				</View>
				*/}
			</View>
		</View>
	);
}

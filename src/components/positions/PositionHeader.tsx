import { memo } from "react";
import { Text, View } from "react-native";
import type { TokenInfo } from "../../tokens";
import { formatUPNLDisplay } from "../../utils/positions/calculations";
import { formatUPNLDisplaySol } from "../../utils/positions/formatters";
import { TokenIcons } from "./TokenIcons";

interface PositionHeaderProps {
	tokenXInfo: TokenInfo | null;
	tokenYInfo: TokenInfo | null;
	inRange: boolean;
	totalValue: string;
	upnlValue: number | null;
	upnlPercentage: number | null;
	upnlIsSol?: boolean;
}

function PositionHeaderComponent({
	tokenXInfo,
	tokenYInfo,
	inRange,
	totalValue,
	upnlValue,
	upnlPercentage,
	upnlIsSol = false,
}: PositionHeaderProps) {
	const upnlColorClass =
		upnlValue !== null
			? upnlValue >= 0
				? "text-emerald-400"
				: "text-red-400"
			: "";

	return (
		<View className="flex-row justify-between items-start mb-6">
			<View className="flex-row items-center gap-3 flex-1 min-w-0">
				<TokenIcons tokenXInfo={tokenXInfo} tokenYInfo={tokenYInfo} />
				<View className="flex-1 min-w-0">
					<Text
						className="text-app-text font-sans-bold text-lg"
						numberOfLines={1}
					>
						{tokenXInfo?.symbol} / {tokenYInfo?.symbol}
					</Text>
				</View>
			</View>
			<View className="items-end gap-1 flex-shrink-0">
				<View
					className={`px-2 py-1 rounded-md ${inRange ? "bg-emerald-500/20" : "bg-orange-500/20"}`}
				>
					<Text
						className={`text-[10px] font-sans-bold ${inRange ? "text-emerald-500" : "text-orange-500"}`}
					>
						{inRange ? "IN RANGE" : "OUT OF RANGE"}
					</Text>
				</View>
				<Text className="text-app-text font-pixel text-lg">{totalValue}</Text>
				{upnlValue != null && upnlPercentage != null && (
					<Text className={`text-xs font-pixel ${upnlColorClass}`}>
						{upnlIsSol
							? formatUPNLDisplaySol(upnlValue, upnlPercentage)
							: formatUPNLDisplay(upnlValue, upnlPercentage)}
					</Text>
				)}
			</View>
		</View>
	);
}

export const PositionHeader = memo(PositionHeaderComponent);

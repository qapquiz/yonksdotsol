"use no memo";

import React from "react";
import type { ColorProp } from "react-native-android-widget";
import { FlexWidget, TextWidget } from "react-native-android-widget";

interface PortfolioWidgetProps {
	mode: "light" | "dark";
	totalPnlSol: number;
	totalPnlPercent: number;
	totalValueSol: number;
	totalInitialDepositSol: number;
	totalUnclaimedFeesSol: number;
	positionCount: number;
	lastUpdated: string;
}

interface Palette {
	background: ColorProp;
	border: ColorProp;
	textPrimary: ColorProp;
	textSecondary: ColorProp;
	textMuted: ColorProp;
	badgeBg: ColorProp;
	profit: ColorProp;
	loss: ColorProp;
}

function paletteFor(mode: "light" | "dark"): Palette {
	if (mode === "dark") {
		return {
			background: "#151515",
			border: "#151515",
			textPrimary: "#ffffff",
			textSecondary: "#aaaaaa",
			textMuted: "#777777",
			badgeBg: "#252525",
			profit: "#34d399",
			loss: "#f87171",
		};
	}
	return {
		background: "#ffffff",
		border: "#e0e0e0",
		textPrimary: "#1a1a1a",
		textSecondary: "#666666",
		textMuted: "#999999",
		badgeBg: "#eeeeee",
		profit: "#059669",
		loss: "#dc2626",
	};
}

interface SmallValueParts {
	leadingText: string;
	superscript: string;
	digits: string;
}

function formatSmallValue(value: number): SmallValueParts | null {
	if (!Number.isFinite(value) || value >= 0.01) return null;
	const str = value.toFixed(9).replace(/0+$/, "");
	const decimalPart = str.split(".")[1] || "";
	const match = decimalPart.match(/^0*/);
	const leadingZeros = match ? match[0].length : 0;
	if (leadingZeros < 4) return null;
	const rawDigits = decimalPart.slice(leadingZeros);
	const significantDigits = (rawDigits + "0000").slice(0, 4);
	const additionalZeros = leadingZeros - 2;
	return {
		leadingText: "0.00",
		superscript: String(additionalZeros),
		digits: significantDigits,
	};
}

function formatPercent(value: number): string {
	if (!Number.isFinite(value) || isNaN(value)) return "0.00";
	return Math.abs(value).toFixed(2);
}

function SolValueWidget({
	value,
	color,
	fontSize,
	fontFamily,
}: {
	value: number;
	color: ColorProp;
	fontSize: number;
	fontFamily: string;
}) {
	const small = formatSmallValue(value);

	if (small) {
		return (
			<FlexWidget
				style={{
					flexDirection: "row",
					alignItems: "flex-start",
				}}
			>
				<TextWidget
					text={small.leadingText}
					style={{
						fontSize,
						fontFamily,
						color,
					}}
				/>
				<TextWidget
					text={small.superscript}
					style={{
						fontSize: Math.max(6, fontSize - 4),
						fontFamily,
						color,
					}}
				/>
				<TextWidget
					text={small.digits}
					style={{
						fontSize,
						fontFamily,
						color,
					}}
				/>
			</FlexWidget>
		);
	}

	const text = Number.isFinite(value) ? value.toFixed(4) : "0.0000";

	return (
		<TextWidget
			text={text}
			style={{
				fontSize,
				fontFamily,
				color,
			}}
		/>
	);
}

export function PortfolioWidget({
	mode,
	totalPnlSol,
	totalPnlPercent,
	totalValueSol,
	totalInitialDepositSol,
	totalUnclaimedFeesSol,
	positionCount,
	lastUpdated,
}: PortfolioWidgetProps) {
	const p = paletteFor(mode);
	const isProfit = totalPnlSol >= 0;
	const pnlColor = isProfit ? p.profit : p.loss;
	const sign = isProfit ? "+" : "-";

	const pnlPercentText = `${sign}${formatPercent(totalPnlPercent)}%`;

	return (
		<FlexWidget
			style={{
				height: "match_parent",
				width: "match_parent",
				backgroundColor: p.background,
				borderRadius: 16,
				borderWidth: 1,
				borderColor: p.border,
				padding: 16,
				flexDirection: "column",
				justifyContent: "space-between",
			}}
			clickAction="OPEN_APP"
		>
			{/* Top row: Label + badge | PnL */}
			<FlexWidget
				style={{
					flexDirection: "column",
					alignItems: "flex-start",
					justifyContent: "space-between",
				}}
			>
				{/* Left: Label + count badge */}
				<FlexWidget
					style={{
						flexDirection: "row",
						justifyContent: "space-around",
						flexGap: 6,
					}}
				>
					<FlexWidget
						style={{
							flex: 1,
							flexDirection: "row",
							flexGap: 6,
						}}
					>
						<TextWidget
							text="PORTFOLIO SUMMARY"
							style={{
								fontSize: 9,
								fontFamily: "Geist-Bold",
								color: p.textMuted,
								letterSpacing: 1,
							}}
						/>
						<FlexWidget
							style={{
								backgroundColor: p.badgeBg,
								borderRadius: 10,
								paddingHorizontal: 5,
								paddingVertical: 1,
							}}
						>
							<TextWidget
								text={`${positionCount}`}
								style={{
									fontSize: 9,
									fontFamily: "Geist-Bold",
									color: p.textSecondary,
								}}
							/>
						</FlexWidget>
					</FlexWidget>
					{/* Last updated */}
					<FlexWidget
						style={{
							flex: 1,
							alignItems: "flex-end",
							justifyContent: "flex-end",
						}}
					>
						<TextWidget
							text={lastUpdated}
							style={{
								fontSize: 8,
								fontFamily: "Geist-Regular",
								color: p.textMuted,
							}}
						/>
					</FlexWidget>
				</FlexWidget>

				{/* Right: PnL */}
				<FlexWidget
					style={{
						alignItems: "flex-start",
					}}
				>
					<FlexWidget
						style={{
							flexDirection: "row",
							alignItems: "flex-end",
							flexGap: 2,
						}}
					>
						{isProfit && (
							<TextWidget
								text={sign}
								style={{
									fontSize: 18,
									fontFamily: "GeistPixel-Square",
									color: pnlColor,
								}}
							/>
						)}
						<SolValueWidget
							value={Math.abs(totalPnlSol)}
							color={pnlColor}
							fontSize={18}
							fontFamily="GeistPixel-Square"
						/>
						<TextWidget
							text="SOL"
							style={{
								fontSize: 10,
								fontFamily: "GeistPixel-Square",
								color: pnlColor,
								marginBottom: 1,
							}}
						/>
					</FlexWidget>
					<TextWidget
						text={pnlPercentText}
						style={{
							fontSize: 12,
							fontFamily: "GeistPixel-Square",
							color: pnlColor,
						}}
					/>
				</FlexWidget>
			</FlexWidget>

			{/* Bottom row: Metrics + last updated */}
			<FlexWidget
				style={{
					width: "match_parent",
					flexDirection: "row",
					alignItems: "flex-end",
					justifyContent: "space-between",
				}}
			>
				{/* Metrics group */}
				<FlexWidget
					style={{
						flexDirection: "row",
						flex: 1,
						justifyContent: "space-between",
						// flexGap: 8,
					}}
				>
					{/* VALUE */}
					<FlexWidget style={{ flex: 2 }}>
						<TextWidget
							text="VALUE"
							style={{
								fontSize: 8,
								fontFamily: "Geist-Bold",
								color: p.textMuted,
								letterSpacing: 1,
								marginBottom: 2,
							}}
						/>
						<FlexWidget
							style={{
								flexDirection: "row",
								alignItems: "flex-end",
								flexGap: 2,
							}}
						>
							<SolValueWidget
								value={totalValueSol}
								color={p.textPrimary}
								fontSize={13}
								fontFamily="GeistPixel-Square"
							/>
							<TextWidget
								text="SOL"
								style={{
									fontSize: 9,
									fontFamily: "GeistPixel-Square",
									color: p.textPrimary,
									marginBottom: 1,
								}}
							/>
						</FlexWidget>
					</FlexWidget>

					{/* DEPOSITED */}
					<FlexWidget style={{ flex: 2 }}>
						<TextWidget
							text="DEPOSITED"
							style={{
								fontSize: 8,
								fontFamily: "Geist-Bold",
								color: p.textMuted,
								letterSpacing: 1,
								marginBottom: 2,
							}}
						/>
						<FlexWidget
							style={{
								flexDirection: "row",
								alignItems: "flex-end",
								flexGap: 2,
							}}
						>
							<SolValueWidget
								value={totalInitialDepositSol}
								color={p.textPrimary}
								fontSize={13}
								fontFamily="GeistPixel-Square"
							/>
							<TextWidget
								text="SOL"
								style={{
									fontSize: 9,
									fontFamily: "GeistPixel-Square",
									color: p.textPrimary,
									marginBottom: 1,
								}}
							/>
						</FlexWidget>
					</FlexWidget>

					{/* UNCLAIMED FEES */}
					<FlexWidget style={{ flex: 2 }}>
						<TextWidget
							text="UNCLAIMED FEES"
							style={{
								fontSize: 8,
								fontFamily: "Geist-Bold",
								color: p.textMuted,
								letterSpacing: 1,
								marginBottom: 2,
							}}
						/>
						<FlexWidget
							style={{
								flexDirection: "row",
								alignItems: "flex-end",
								flexGap: 2,
							}}
						>
							<SolValueWidget
								value={totalUnclaimedFeesSol}
								color={p.textPrimary}
								fontSize={13}
								fontFamily="GeistPixel-Square"
							/>
							<TextWidget
								text="SOL"
								style={{
									fontSize: 9,
									fontFamily: "GeistPixel-Square",
									color: p.textPrimary,
									marginBottom: 1,
								}}
							/>
						</FlexWidget>
					</FlexWidget>
				</FlexWidget>
			</FlexWidget>
		</FlexWidget>
	);
}

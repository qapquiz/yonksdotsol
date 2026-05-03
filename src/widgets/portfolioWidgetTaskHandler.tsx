"use no memo";

import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import { getStoredWalletAddress } from "../stores/walletStore";

// ─── Colors (dark theme, from src/config/theme.ts) ───────────────────

const COLORS = {
	bg: "#050505",
	surface: "#151515",
	surfaceHighlight: "#252525",
	border: "#333333",
	text: "#ffffff",
	textSecondary: "#aaaaaa",
	textMuted: "#777777",
	primary: "#8FA893",
	profit: "#34d399", // emerald-400
	loss: "#f87171", // red-400
} as const;

// ─── Headless data fetching ──────────────────────────────────────────

async function fetchPortfolioSummary(walletAddress: string) {
	// Dynamic imports to avoid polyfill issues at module scope in headless context
	const { getSharedConnection } = require("../config/connection");
	const DLMM = require("@meteora-ag/dlmm");
	const { PublicKey } = require("@solana/web3.js");
	const { createDataServices } = require("../services/data");
	const { fetchPositionPnL } = require("metcomet");
	const {
		computePoolPnLSummary,
	} = require("../utils/positions/pnlAggregation");

	// 1. Fetch all DLMM positions
	const connection = getSharedConnection();
	const positionsMap: Map<string, any> = await DLMM.getAllLbPairPositionsByUser(
		connection,
		new PublicKey(walletAddress),
	);
	const poolAddresses = Array.from(positionsMap.keys());

	if (poolAddresses.length === 0) {
		return null;
	}

	// 2. Collect unique mints
	const mintSet = new Set<string>();
	const positionsArray: any[] = Array.from(positionsMap.values());
	for (const position of positionsArray) {
		mintSet.add(position.tokenX.mint.address.toBase58());
		mintSet.add(position.tokenY.mint.address.toBase58());
	}
	const uniqueMints = Array.from(mintSet);

	// 3. Fetch token prices
	const { tokens } = createDataServices();
	const tokenData = await tokens.getPrices(uniqueMints);

	// 4. Fetch PnL for each pool
	const allPnL: any[] = [];
	for (const poolAddress of poolAddresses) {
		try {
			const result = await fetchPositionPnL({
				poolAddress,
				user: walletAddress,
				status: "open",
			});
			if (result?.positions) {
				allPnL.push(...result.positions);
			}
		} catch (e) {
			console.error(`Widget: PnL fetch failed for pool ${poolAddress}:`, e);
		}
	}

	if (allPnL.length === 0) {
		return null;
	}

	// 5. Aggregate
	const summary = computePoolPnLSummary(allPnL);
	return {
		...summary,
		positionCount: poolAddresses.length,
	};
}

// ─── Number formatting ───────────────────────────────────────────────

function formatSolValue(value: number): string {
	if (!Number.isFinite(value)) return "0.0000";
	return value.toFixed(4);
}

// ─── SVG Icons ───────────────────────────────────────────────────────

const REFRESH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${COLORS.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;

// ─── Widget rendering ────────────────────────────────────────────────

function PortfolioSummaryWidget({
	summary,
	lastUpdated,
}: {
	summary: {
		totalPnlSol: number;
		totalPnlPercent: number;
		totalValueSol: number;
		totalInitialDepositSol: number;
		totalUnclaimedFeesSol: number;
		positionCount: number;
	} | null;
	lastUpdated: string;
}) {
	const hasData = summary !== null;
	const isProfit = hasData ? summary.totalPnlSol >= 0 : true;
	const pnlColor = isProfit ? COLORS.profit : COLORS.loss;
	const sign = isProfit ? "+" : "-";

	const pnlSolDisplay = hasData
		? formatSolValue(Math.abs(summary.totalPnlSol))
		: "—";
	const pnlPctDisplay = hasData
		? `${sign}${isNaN(summary.totalPnlPercent) ? "0.00" : summary.totalPnlPercent.toFixed(2)}%`
		: "—";
	const valueDisplay = hasData ? formatSolValue(summary.totalValueSol) : "—";
	const depositedDisplay = hasData
		? formatSolValue(summary.totalInitialDepositSol)
		: "—";
	const feesDisplay = hasData
		? formatSolValue(summary.totalUnclaimedFeesSol)
		: "—";
	const countDisplay = hasData ? String(summary.positionCount) : "0";

	return (
		<FlexWidget
			clickAction="OPEN_APP"
			style={{
				backgroundColor: COLORS.surface,
				borderRadius: 24,
				padding: 20,
				flexDirection: "column",
				width: "match_parent",
			}}
		>
			{/* Header row: title + count badge + refresh button */}
			<FlexWidget
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					width: "match_parent",
					marginBottom: 12,
				}}
			>
				<FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
					<TextWidget
						text="PORTFOLIO SUMMARY"
						style={{
							fontSize: 10,
							color: COLORS.textMuted,
							fontWeight: "700",
							letterSpacing: 1.5,
						}}
					/>
					{/* Position count badge */}
					<FlexWidget
						style={{
							backgroundColor: COLORS.surfaceHighlight,
							borderRadius: 10,
							width: 20,
							height: 20,
							alignItems: "center",
							justifyContent: "center",
							marginLeft: 8,
						}}
					>
						<TextWidget
							text={countDisplay}
							style={{
								fontSize: 10,
								color: COLORS.textSecondary,
								fontWeight: "700",
							}}
						/>
					</FlexWidget>
				</FlexWidget>
				{/* Refresh button */}
				<FlexWidget
					clickAction="REFRESH"
					style={{
						width: 32,
						height: 32,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<SvgWidget svg={REFRESH_ICON_SVG} style={{ width: 18, height: 18 }} />
				</FlexWidget>
			</FlexWidget>

			{/* PnL value */}
			<FlexWidget
				style={{
					flexDirection: "row",
					alignItems: "flex-end",
					marginBottom: 4,
				}}
			>
				{hasData && (
					<TextWidget
						text={sign}
						style={{
							fontSize: 22,
							color: pnlColor,
						}}
					/>
				)}
				<TextWidget
					text={pnlSolDisplay}
					style={{
						fontSize: 22,
						color: hasData ? pnlColor : COLORS.textMuted,
					}}
				/>
				<TextWidget
					text=" SOL"
					style={{
						fontSize: 12,
						color: hasData ? pnlColor : COLORS.textMuted,
					}}
				/>
			</FlexWidget>

			{/* PnL percent */}
			<TextWidget
				text={pnlPctDisplay}
				style={{
					fontSize: 13,
					color: hasData ? pnlColor : COLORS.textMuted,
					marginBottom: 16,
				}}
			/>

			{/* Bottom row: Value / Deposited / Unclaimed Fees */}
			<FlexWidget
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					width: "match_parent",
				}}
			>
				{/* VALUE */}
				<FlexWidget style={{ flexDirection: "column", flex: 1 }}>
					<TextWidget
						text="VALUE"
						style={{
							fontSize: 10,
							color: COLORS.textMuted,
							fontWeight: "700",
							letterSpacing: 1.5,
							marginBottom: 4,
						}}
					/>
					<FlexWidget style={{ flexDirection: "row", alignItems: "flex-end" }}>
						<TextWidget
							text={valueDisplay}
							style={{
								fontSize: 14,
								color: COLORS.text,
							}}
						/>
						<TextWidget
							text=" SOL"
							style={{
								fontSize: 10,
								color: COLORS.textMuted,
							}}
						/>
					</FlexWidget>
				</FlexWidget>

				{/* DEPOSITED */}
				<FlexWidget style={{ flexDirection: "column", flex: 1 }}>
					<TextWidget
						text="DEPOSITED"
						style={{
							fontSize: 10,
							color: COLORS.textMuted,
							fontWeight: "700",
							letterSpacing: 1.5,
							marginBottom: 4,
						}}
					/>
					<FlexWidget style={{ flexDirection: "row", alignItems: "flex-end" }}>
						<TextWidget
							text={depositedDisplay}
							style={{
								fontSize: 14,
								color: COLORS.text,
							}}
						/>
						<TextWidget
							text=" SOL"
							style={{
								fontSize: 10,
								color: COLORS.textMuted,
							}}
						/>
					</FlexWidget>
				</FlexWidget>

				{/* UNCLAIMED FEES */}
				<FlexWidget style={{ flexDirection: "column", flex: 1 }}>
					<TextWidget
						text="UNCLAIMED FEES"
						style={{
							fontSize: 10,
							color: COLORS.textMuted,
							fontWeight: "700",
							letterSpacing: 1.5,
							marginBottom: 4,
						}}
					/>
					<FlexWidget style={{ flexDirection: "row", alignItems: "flex-end" }}>
						<TextWidget
							text={feesDisplay}
							style={{
								fontSize: 14,
								color: COLORS.text,
							}}
						/>
						<TextWidget
							text=" SOL"
							style={{
								fontSize: 10,
								color: COLORS.textMuted,
							}}
						/>
					</FlexWidget>
				</FlexWidget>
			</FlexWidget>

			{/* Last updated timestamp */}
			<TextWidget
				text={lastUpdated}
				style={{
					fontSize: 9,
					color: COLORS.textMuted,
					marginTop: 12,
				}}
			/>
		</FlexWidget>
	);
}

// ─── Error / no-wallet state widget ──────────────────────────────────

function ErrorWidget({ message }: { message: string }) {
	return (
		<FlexWidget
			clickAction="OPEN_APP"
			style={{
				backgroundColor: COLORS.surface,
				borderRadius: 24,
				padding: 20,
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				height: 160,
			}}
		>
			<TextWidget
				text="YONKS"
				style={{
					fontSize: 14,
					color: COLORS.primary,
					fontWeight: "700",
					letterSpacing: 2,
					marginBottom: 8,
				}}
			/>
			<TextWidget
				text={message}
				style={{
					fontSize: 11,
					color: COLORS.textMuted,
					textAlign: "center",
				}}
			/>
		</FlexWidget>
	);
}

// ─── Task handler ────────────────────────────────────────────────────

async function portfolioWidgetTaskHandler({
	widgetAction,
	clickAction,
	renderWidget,
}: WidgetTaskHandlerProps) {
	// Don't render for deleted widgets
	if (widgetAction === "WIDGET_DELETED") return;

	// Handle refresh click
	if (widgetAction === "WIDGET_CLICK" && clickAction === "REFRESH") {
		// Fall through to re-fetch and render
	}

	const walletAddress = getStoredWalletAddress();

	if (!walletAddress) {
		renderWidget(
			<ErrorWidget message="Connect wallet in app to see portfolio data" />,
		);
		return;
	}

	try {
		const summary = await fetchPortfolioSummary(walletAddress);
		const lastUpdated = new Date().toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});

		renderWidget(
			<PortfolioSummaryWidget
				summary={summary}
				lastUpdated={`Updated ${lastUpdated}`}
			/>,
		);
	} catch (e) {
		console.error("Widget: render failed:", e);
		renderWidget(<ErrorWidget message="Failed to load portfolio data" />);
	}
}

export default portfolioWidgetTaskHandler;

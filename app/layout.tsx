import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = DM_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
});

const serif = Cormorant_Garamond({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
	title: "LOVE MATCH | とくぞう専用マッチング",
	description:
		"とくぞうと新しい生活を始めるマッチングアプリ。あなたの好みに合わせて無限のとくぞうが流れます。さあ、スワイプしてとくぞうを見つけましょう。",
};

export const viewport: Viewport = {
	themeColor: "#ff6b5f",
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="ja">
			<body
				className={`${sans.variable} ${serif.variable} bg-[var(--page)] text-[var(--ink)] antialiased`}
			>
				<SiteHeader />
				<main className="min-h-screen w-full">{children}</main>
			</body>
		</html>
	);
}

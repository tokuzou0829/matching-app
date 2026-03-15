import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "LOVE MATCH",
		short_name: "LOVE MATCH",
		description:
			"とくぞうと新しい生活を始めるマッチングアプリ。あなたの好みに合わせて無限のとくぞうが流れます。さあ、スワイプしてとくぞうを見つけましょう。",
		start_url: "/",
		display: "standalone",
		background_color: "#f4ede5",
		theme_color: "#ff6b5f",
		icons: [
			{
				sizes: "192x192",
				src: "icon192_rounded.png",
				type: "image/png",
			},
			{
				sizes: "512x512",
				src: "icon512_rounded.png",
				type: "image/png",
			},
		],
	};
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "スパーク",
		short_name: "スパーク",
		description:
			"無限のとくぞうをスワイプできるスマホネイティブなマッチングアプリ。",
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

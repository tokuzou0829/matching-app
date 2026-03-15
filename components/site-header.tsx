"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/lib/auth-actions";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
	const pathname = usePathname();
	const { data: session } = authClient.useSession();

	if (!pathname.startsWith("/admin")) {
		return null;
	}

	return (
		<header className="sticky top-0 z-40 border-b border-black/5 bg-[rgba(248,242,236,0.88)] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
			<div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
				<Link href="/" className="flex items-center gap-3 text-[var(--ink)]">
					<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_12px_26px_rgba(255,107,95,0.28)]">
						S
					</span>
					<span>
						<span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
							Admin Upload
						</span>
						<span className="block text-base font-semibold">Spark Console</span>
					</span>
				</Link>

				{session?.user ? (
					<button
						type="button"
						onClick={() => {
							void signOut();
						}}
						className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
					>
						ログアウト
					</button>
				) : null}
			</div>
		</header>
	);
}

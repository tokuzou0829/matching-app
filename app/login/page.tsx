"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { signInWithEmail } from "@/lib/auth-actions";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		const result = await signInWithEmail({
			email,
			password,
		});

		if (!result.success) {
			setError(result.error ?? "ログインに失敗しました。");
			setIsLoading(false);
			return;
		}

		router.push("/");
	};

	return (
		<div className="native-shell mx-auto flex w-full max-w-md flex-col justify-between px-4 pb-8 pt-6">
			<div>
				<Link href="/" className="text-sm font-medium text-[var(--ink-soft)]">
					← 戻る
				</Link>

				<div className="mt-8 py-2 text-[var(--ink)]">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-soft)]">
						Welcome Back
					</p>
					<h1 className="mt-3 text-5xl leading-[0.92]">
						続きの
						<br />
						スワイプへ。
					</h1>
					<p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
						ログインすると、マッチ一覧やチャットの続きがそのまま戻ります。
					</p>
				</div>
			</div>

			<div className="mt-6 border-t border-[var(--line)] pt-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<AuthField label="メールアドレス">
						<input
							required
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="auth-input"
							placeholder="spark@example.com"
						/>
					</AuthField>

					<AuthField label="パスワード">
						<input
							required
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="auth-input"
							placeholder="••••••••"
						/>
					</AuthField>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full rounded-full bg-[var(--ink)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)] disabled:opacity-40"
					>
						{isLoading ? "ログイン中…" : "ログインする"}
					</button>
				</form>

				{error ? (
					<p className="mt-4 rounded-[1.4rem] bg-[rgba(213,83,83,0.12)] px-4 py-3 text-sm text-[var(--danger)]">
						{error}
					</p>
				) : null}

				<p className="mt-5 text-sm text-[var(--ink-soft)]">
					はじめてですか？{" "}
					<Link href="/signup" className="font-semibold text-[var(--accent)]">
						新規登録
					</Link>
				</p>
			</div>
		</div>
	);
}

function AuthField(props: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
				{props.label}
			</span>
			{props.children}
		</div>
	);
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { signUpWithEmail } from "@/lib/auth-actions";
import { savePreferredGender } from "@/lib/signup-preferences";

export default function SignupPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [gender, setGender] = useState<"male" | "female">("male");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		savePreferredGender(gender);

		const result = await signUpWithEmail({
			name,
			email,
			password,
		});

		if (!result.success) {
			setError(result.error ?? "登録に失敗しました。");
			setIsLoading(false);
			return;
		}

		try {
			await fetch("/api/profiles/initialize", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ gender }),
			});
		} catch {
			// ホーム画面で再試行する
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
						Get Started
					</p>
					<h1 className="mt-3 text-5xl leading-[0.92]">
						最初の一枚から、
						<br />
						始めよう。
					</h1>
					<p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
						あなたの情報を登録してすぐにとくぞうを見つけましょう。あなたの好みのとくぞうがきっと見つかります。
					</p>
				</div>
			</div>

			<div className="mt-6 border-t border-[var(--line)] pt-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						{(["male", "female"] as const).map((option) => (
							<button
								type="button"
								key={option}
								onClick={() => setGender(option)}
								className={`rounded-full px-4 py-3 text-sm font-semibold transition ${gender === option ? "bg-[var(--accent)] text-white shadow-[0_16px_30px_rgba(255,107,95,0.2)]" : "bg-white text-[var(--ink-soft)]"}`}
							>
								{option === "male" ? "男性で登録" : "女性で登録"}
							</button>
						))}
					</div>

					<AuthField label="表示名">
						<input
							required
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="auth-input"
							placeholder="たとえば さき"
						/>
					</AuthField>

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
							placeholder="8文字以上がおすすめ"
						/>
					</AuthField>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(255,107,95,0.22)] disabled:opacity-40"
					>
						{isLoading ? "登録中…" : "登録してスワイプ開始"}
					</button>
				</form>

				{error ? (
					<p className="mt-4 rounded-[1.4rem] bg-[rgba(213,83,83,0.12)] px-4 py-3 text-sm text-[var(--danger)]">
						{error}
					</p>
				) : null}

				<p className="mt-5 text-sm text-[var(--ink-soft)]">
					すでにアカウントをお持ちですか？{" "}
					<Link href="/login" className="font-semibold text-[var(--accent)]">
						ログイン
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

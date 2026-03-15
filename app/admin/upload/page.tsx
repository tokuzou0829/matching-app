"use client";

import Image from "next/image";
import Link from "next/link";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import { resizeImageFile } from "@/lib/client-image";

type Gender = "male" | "female";

type TokuzouAsset = {
	id: string;
	gender: Gender;
	imageUrl: string;
	sortOrder: number;
	createdAt: string;
};

export default function AdminUploadPage() {
	const [password, setPassword] = useState("");
	const [activeGender, setActiveGender] = useState<Gender>("female");
	const [assets, setAssets] = useState<TokuzouAsset[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const genderAssets = useMemo(
		() => assets.filter((asset) => asset.gender === activeGender),
		[activeGender, assets],
	);

	useEffect(() => {
		void (async () => {
			try {
				const data = await requestJson<{ authenticated: boolean }>(
					"/api/admin/session",
				);
				setIsAuthenticated(data.authenticated);
			} catch {
				setIsAuthenticated(false);
			} finally {
				setIsCheckingSession(false);
			}
		})();
	}, []);

	const loadAssets = useCallback(async (gender: Gender) => {
		setError(null);

		try {
			const data = await requestJson<{ assets: TokuzouAsset[] }>(
				`/api/admin/assets?gender=${gender}`,
			);
			setAssets((current) => {
				const others = current.filter((asset) => asset.gender !== gender);
				return [...others, ...data.assets];
			});
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		}
	}, []);

	useEffect(() => {
		if (!isAuthenticated) {
			return;
		}

		void loadAssets(activeGender);
	}, [activeGender, isAuthenticated, loadAssets]);

	const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);
		setNotice(null);

		try {
			await requestJson<{ ok: boolean }>("/api/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ password }),
			});
			setIsAuthenticated(true);
			setPassword("");
			setNotice("管理者ログインしました。");
			await loadAssets(activeGender);
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLogout = async () => {
		setIsSubmitting(true);
		setError(null);

		try {
			await requestJson<{ ok: boolean }>("/api/admin/logout", {
				method: "POST",
			});
			setIsAuthenticated(false);
			setAssets([]);
			setNotice("ログアウトしました。");
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (selectedFiles.length === 0) {
			setError("画像を1枚以上選択してください。");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		setNotice(null);

		try {
			const photos = await Promise.all(
				selectedFiles.map((file) =>
					resizeImageFile(file, {
						width: 960,
						height: 1280,
						maxBytes: 500_000,
						qualities: [0.82, 0.72, 0.6],
					}),
				),
			);

			const data = await requestJson<{ assets: TokuzouAsset[] }>(
				"/api/admin/assets",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						gender: activeGender,
						photos,
					}),
				},
			);

			setAssets((current) => {
				const others = current.filter((asset) => asset.gender !== activeGender);
				return [...others, ...data.assets];
			});
			setSelectedFiles([]);
			setNotice(
				`${genderLabel(activeGender)}向け画像を ${photos.length} 枚追加しました。`,
			);
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (assetId: string) => {
		setIsSubmitting(true);
		setError(null);
		setNotice(null);

		try {
			const data = await requestJson<{
				gender: Gender;
				assets: TokuzouAsset[];
			}>(`/api/admin/assets/${assetId}`, {
				method: "DELETE",
			});

			setAssets((current) => {
				const others = current.filter((asset) => asset.gender !== data.gender);
				return [...others, ...data.assets];
			});
			setNotice("画像を削除しました。");
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isCheckingSession) {
		return (
			<div className="native-shell mx-auto flex w-full max-w-md items-center justify-center px-4">
				<div className="glass-panel w-full rounded-[2rem] px-6 py-10 text-center text-sm text-[var(--ink-soft)]">
					管理セッションを確認しています…
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="native-shell mx-auto flex w-full max-w-md flex-col justify-between px-4 pb-8 pt-6">
				<div>
					<Link href="/" className="text-sm font-medium text-[var(--ink-soft)]">
						← ホームへ戻る
					</Link>

					<div className="mt-6 rounded-[2rem] border border-[var(--line)] bg-white px-5 py-5 text-[var(--ink)] shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-soft)]">
							Admin Upload
						</p>
						<h1 className="mt-3 text-5xl leading-[0.92]">
							画像プールを、
							<br />
							更新する。
						</h1>
						<p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
							`ADMIN_PASS`
							でログインすると、無限候補に使うとくぞう画像を追加できます。
						</p>
					</div>
				</div>

				<div className="glass-panel mt-6 rounded-[2rem] p-5">
					<form onSubmit={handleLogin} className="space-y-4">
						<label className="block">
							<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
								管理パスワード
							</span>
							<input
								required
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="admin-input"
								placeholder="ADMIN_PASS"
							/>
						</label>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(255,107,95,0.22)] disabled:opacity-40"
						>
							{isSubmitting ? "ログイン中…" : "管理者ログイン"}
						</button>
					</form>

					{error ? (
						<p className="mt-4 rounded-[1.4rem] bg-[rgba(213,83,83,0.12)] px-4 py-3 text-sm text-[var(--danger)]">
							{error}
						</p>
					) : null}
					{notice ? (
						<p className="mt-4 rounded-[1.4rem] bg-[rgba(37,194,138,0.12)] px-4 py-3 text-sm text-[var(--ink)]">
							{notice}
						</p>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<div className="native-shell mx-auto flex w-full max-w-3xl flex-col px-4 pb-8 pt-4">
			<div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-[var(--line)] bg-white px-5 py-5 text-[var(--ink)] shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-soft)]">
							Tokuzou Asset Pool
						</p>
						<h1 className="mt-3 text-4xl leading-none">無限候補の素材を追加</h1>
						<p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
							男女別に画像を積み上げると、マッチ画面で無限のとくぞう候補が生成されます。
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							void handleLogout();
						}}
						className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
					>
						ログアウト
					</button>
				</div>
			</div>

			<div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
				<div className="glass-panel rounded-[2rem] p-5">
					<div className="grid grid-cols-2 gap-3">
						{(["female", "male"] as const).map((gender) => (
							<button
								type="button"
								key={gender}
								onClick={() => setActiveGender(gender)}
								className={`rounded-full px-4 py-3 text-sm font-semibold ${activeGender === gender ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--ink-soft)]"}`}
							>
								{genderLabel(gender)}向け
							</button>
						))}
					</div>

					<form onSubmit={handleUpload} className="mt-4 space-y-4">
						<label className="block">
							<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
								画像を追加
							</span>
							<input
								type="file"
								accept="image/*"
								multiple
								onChange={(event) =>
									setSelectedFiles(Array.from(event.target.files ?? []))
								}
								className="admin-input"
							/>
						</label>

						<div className="rounded-[1.4rem] bg-white/70 px-4 py-3 text-sm text-[var(--ink-soft)]">
							選択中: {selectedFiles.length} 枚
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-full bg-[var(--ink)] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)] disabled:opacity-40"
						>
							{isSubmitting ? "アップロード中…" : "アップロードする"}
						</button>
					</form>

					{error ? (
						<p className="mt-4 rounded-[1.4rem] bg-[rgba(213,83,83,0.12)] px-4 py-3 text-sm text-[var(--danger)]">
							{error}
						</p>
					) : null}
					{notice ? (
						<p className="mt-4 rounded-[1.4rem] bg-[rgba(37,194,138,0.12)] px-4 py-3 text-sm text-[var(--ink)]">
							{notice}
						</p>
					) : null}
				</div>

				<div className="glass-panel rounded-[2rem] p-5">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
								Current Pool
							</p>
							<h2 className="mt-2 text-3xl text-[var(--ink)]">
								{genderLabel(activeGender)}向け素材
							</h2>
						</div>
						<div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]">
							{genderAssets.length} 枚
						</div>
					</div>

					{genderAssets.length > 0 ? (
						<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
							{genderAssets.map((asset) => (
								<div
									key={asset.id}
									className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
								>
									<div className="relative aspect-square">
										<Image
											src={asset.imageUrl}
											alt="とくぞう素材"
											fill
											unoptimized
											className="object-cover"
										/>
									</div>
									<div className="flex items-center justify-between gap-2 px-3 py-3">
										<div>
											<p className="text-xs font-semibold text-[var(--ink)]">
												#{asset.sortOrder + 1}
											</p>
											<p className="text-[11px] text-[var(--ink-soft)]">
												{formatDate(asset.createdAt)}
											</p>
										</div>
										<button
											type="button"
											onClick={() => {
												void handleDelete(asset.id);
											}}
											className="rounded-full bg-[rgba(213,83,83,0.12)] px-3 py-2 text-[11px] font-semibold text-[var(--danger)]"
										>
											削除
										</button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="mt-4 rounded-[1.6rem] bg-white/70 px-5 py-10 text-center text-sm text-[var(--ink-soft)]">
							まだ画像がありません。左のフォームから追加してください。
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

async function requestJson<T>(input: string, init?: RequestInit) {
	const response = await fetch(input, {
		credentials: "include",
		...init,
	});

	const body = (await response.json().catch(() => null)) as
		| { error?: string }
		| T
		| null;

	if (!response.ok) {
		throw new Error(
			body &&
				typeof body === "object" &&
				"error" in body &&
				typeof body.error === "string"
				? body.error
				: "通信に失敗しました。",
		);
	}

	return body as T;
}

function toErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "エラーが発生しました。";
}

function genderLabel(gender: Gender) {
	return gender === "male" ? "男性" : "女性";
}

function formatDate(value: string) {
	const date = new Date(value);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type {
	ChangeEvent,
	Dispatch,
	ReactNode,
	PointerEvent as ReactPointerEvent,
	SetStateAction,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { resizeImageFile } from "@/lib/client-image";
import {
	clearPreferredGender,
	loadPreferredGender,
} from "@/lib/signup-preferences";

type Gender = "male" | "female";
type Tab = "discover" | "matches" | "profile";

type ProfilePhoto = {
	id: string;
	url: string;
	isPrimary: boolean;
};

type MyProfile = {
	userId: string;
	name: string;
	email: string;
	image: string | null;
	gender: Gender;
	age: number;
	location: string;
	occupation: string;
	bio: string;
	onboardingCompleted: boolean;
	isTokuzou: boolean;
	photos: ProfilePhoto[];
};

type PublicProfile = {
	userId: string;
	candidateId?: string;
	name: string;
	gender: Gender;
	age: number;
	location: string;
	occupation: string;
	bio: string;
	isTokuzou: boolean;
	photos: ProfilePhoto[];
	primaryPhotoUrl: string | null;
};

type MatchSummary = {
	id: string;
	createdAt: string;
	updatedAt: string;
	tokuzou: PublicProfile;
	latestMessage: string | null;
};

type ChatMessage = {
	id: string;
	body: string;
	createdAt: string;
	isMe: boolean;
	senderName: string;
};

type ChatState = {
	match: MatchSummary;
	messages: ChatMessage[];
};

type MatchMoment = {
	id: string;
	tokuzou: PublicProfile;
};

type DiscoveryResponse = {
	requiresOnboarding: boolean;
	candidate: DiscoveredCandidate | null;
};

type DiscoveredCandidate = PublicProfile & { candidateId: string };

type DecisionPayload = {
	candidateId: string;
	action: "like" | "pass";
};

type ProfileFormState = {
	gender: Gender;
	age: string;
	location: string;
	occupation: string;
	bio: string;
};

const DEFAULT_FORM: ProfileFormState = {
	gender: "male",
	age: "26",
	location: "東京都",
	occupation: "企画職",
	bio: "会話のテンポが自然に合う人と、ちゃんと長く仲良くなりたいです。",
};

const SWIPE_THRESHOLD = 110;

export function MatchingApp() {
	const { data: session, isPending } = authClient.useSession();
	const [tab, setTab] = useState<Tab>("discover");
	const [profile, setProfile] = useState<MyProfile | null>(null);
	const [candidate, setCandidate] = useState<DiscoveredCandidate | null>(null);
	const [matches, setMatches] = useState<MatchSummary[]>([]);
	const [activeChat, setActiveChat] = useState<ChatState | null>(null);
	const [profileForm, setProfileForm] =
		useState<ProfileFormState>(DEFAULT_FORM);
	const [chatMessage, setChatMessage] = useState("");
	const [storedGender, setStoredGender] = useState<Gender | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [matchMoment, setMatchMoment] = useState<MatchMoment | null>(null);
	const [activeCandidateProfile, setActiveCandidateProfile] =
		useState<PublicProfile | null>(null);
	const [didTryGenderInitialization, setDidTryGenderInitialization] =
		useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const candidateRef = useRef<DiscoveredCandidate | null>(null);
	const pendingDecisionRef = useRef<DecisionPayload | null>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const dragPointerIdRef = useRef<number | null>(null);
	const photoInputRef = useRef<HTMLInputElement | null>(null);

	const isOnboarded = profile?.onboardingCompleted ?? false;
	const isDiscoverTab = tab === "discover";
	const preferredGender = profile?.gender ?? storedGender;
	const heroPhoto =
		candidate?.primaryPhotoUrl ?? candidate?.photos[0]?.url ?? null;
	const dragProgress = Math.min(Math.abs(dragOffset.x) / SWIPE_THRESHOLD, 1);
	const dragRotation = dragOffset.x / 18;
	const dragDirection =
		dragOffset.x > 0 ? "like" : dragOffset.x < 0 ? "pass" : null;

	const syncCandidate = useCallback(
		(nextCandidate: DiscoveredCandidate | null) => {
			candidateRef.current = nextCandidate;
			setCandidate(nextCandidate);
		},
		[],
	);

	const syncDragOffset = useCallback((nextOffset: { x: number; y: number }) => {
		setDragOffset(nextOffset);
	}, []);

	const syncFormFromProfile = useCallback((nextProfile: MyProfile | null) => {
		if (nextProfile) {
			setProfileForm({
				gender: nextProfile.gender,
				age: nextProfile.age > 0 ? String(nextProfile.age) : DEFAULT_FORM.age,
				location: nextProfile.location || DEFAULT_FORM.location,
				occupation: nextProfile.occupation || DEFAULT_FORM.occupation,
				bio: nextProfile.bio || DEFAULT_FORM.bio,
			});
			return;
		}

		const localGender = loadPreferredGender();
		setProfileForm((current) => ({
			...current,
			gender: localGender ?? current.gender,
		}));
	}, []);

	const loadAppState = useCallback(async () => {
		if (!session?.user) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const [profileData, discoveryData, matchesData] = await Promise.all([
				requestJson<{ profile: MyProfile | null }>("/api/profiles/me"),
				requestJson<DiscoveryResponse>("/api/matching/discovery"),
				requestJson<{ matches: MatchSummary[] }>("/api/matching/matches"),
			]);

			setProfile(profileData.profile);
			syncFormFromProfile(profileData.profile);
			syncCandidate(discoveryData.candidate);
			setMatches(matchesData.matches);

			if (profileData.profile) {
				setDidTryGenderInitialization(true);
			}
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsLoading(false);
		}
	}, [session?.user, syncCandidate, syncFormFromProfile]);

	useEffect(() => {
		setStoredGender(loadPreferredGender());
	}, []);

	useEffect(() => {
		if (!session?.user) {
			setProfile(null);
			syncCandidate(null);
			setMatches([]);
			setActiveChat(null);
			setActiveCandidateProfile(null);
			setDidTryGenderInitialization(false);
			return;
		}

		void loadAppState();
	}, [loadAppState, session?.user, syncCandidate]);

	useEffect(() => {
		if (!session?.user || profile || didTryGenderInitialization) {
			return;
		}

		if (!storedGender) {
			setDidTryGenderInitialization(true);
			return;
		}

		setDidTryGenderInitialization(true);
		void (async () => {
			try {
				await requestJson<{ profile: MyProfile }>("/api/profiles/initialize", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ gender: storedGender }),
				});
				await loadAppState();
			} catch {
				setError("性別の初期設定に失敗しました。もう一度お試しください。");
			}
		})();
	}, [
		didTryGenderInitialization,
		loadAppState,
		profile,
		session?.user,
		storedGender,
	]);

	useEffect(() => {
		if (!matchMoment) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setMatchMoment(null);
		}, 2600);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [matchMoment]);

	const handleProfileSave = async () => {
		setIsSavingProfile(true);
		setError(null);
		setNotice(null);

		try {
			const payload = {
				gender: profile?.gender ?? profileForm.gender,
				age: Number(profileForm.age),
				location: profileForm.location.trim(),
				occupation: profileForm.occupation.trim(),
				bio: profileForm.bio.trim(),
			};

			const data = await requestJson<{ profile: MyProfile }>(
				"/api/profiles/me",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				},
			);

			setProfile(data.profile);
			clearPreferredGender();
			setNotice("プロフィールを更新しました。次のカードへ進めます。");
			setTab("discover");
			await loadAppState();
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handlePickProfilePhoto = () => {
		photoInputRef.current?.click();
	};

	const handleProfilePhotoChange = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) {
			return;
		}

		setIsUploadingPhoto(true);
		setError(null);
		setNotice(null);

		try {
			const dataUrl = await resizeImageFile(file, {
				width: 768,
				height: 768,
				maxBytes: 350_000,
			});
			const data = await requestJson<{ profile: MyProfile }>(
				"/api/profiles/me/photo",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ dataUrl }),
				},
			);

			setProfile(data.profile);
			setNotice("プロフィール画像を更新しました。");
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsUploadingPhoto(false);
		}
	};

	const handleResetProfilePhoto = async () => {
		setIsUploadingPhoto(true);
		setError(null);
		setNotice(null);

		try {
			const data = await requestJson<{ profile: MyProfile }>(
				"/api/profiles/me/photo",
				{
					method: "DELETE",
				},
			);

			setProfile(data.profile);
			setNotice("プロフィール画像を初期画像に戻しました。");
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsUploadingPhoto(false);
		}
	};

	const reserveDecision = useCallback((action: "like" | "pass") => {
		if (pendingDecisionRef.current) {
			return null;
		}

		const activeCandidate = candidateRef.current;
		if (!activeCandidate) {
			return null;
		}

		const payload = {
			candidateId: activeCandidate.candidateId,
			action,
		} satisfies DecisionPayload;

		pendingDecisionRef.current = payload;
		setIsSubmittingDecision(true);
		setError(null);
		setNotice(null);

		return payload;
	}, []);

	const submitDecision = async (payload: DecisionPayload) => {
		if (pendingDecisionRef.current?.candidateId !== payload.candidateId) {
			return;
		}

		try {
			const data = await requestJson<{
				matched: boolean;
				match: MatchSummary | null;
			}>("/api/matching/actions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (data.matched && data.match) {
				setMatchMoment({ id: data.match.id, tokuzou: data.match.tokuzou });
				setTab("matches");
				setNotice(`${data.match.tokuzou.name} とマッチしました。`);
			} else {
				setNotice("次のとくぞうを発見しました。");
			}

			await loadAppState();
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			pendingDecisionRef.current = null;
			setIsSubmittingDecision(false);
			setActiveCandidateProfile(null);
			syncDragOffset({ x: 0, y: 0 });
			setIsDragging(false);
		}
	};

	const animateDecision = async (action: "like" | "pass") => {
		const payload = reserveDecision(action);
		if (!payload) {
			return;
		}

		syncDragOffset({ x: action === "like" ? 520 : -520, y: -30 });
		await new Promise((resolve) => window.setTimeout(resolve, 180));
		await submitDecision(payload);
	};

	const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!candidate || isSubmittingDecision) {
			return;
		}

		dragPointerIdRef.current = event.pointerId;
		dragStartRef.current = { x: event.clientX, y: event.clientY };
		setIsDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragPointerIdRef.current !== event.pointerId || !dragStartRef.current) {
			return;
		}

		syncDragOffset({
			x: event.clientX - dragStartRef.current.x,
			y: (event.clientY - dragStartRef.current.y) * 0.2,
		});
	};

	const handlePointerEnd = async (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragPointerIdRef.current !== event.pointerId) {
			return;
		}

		const dragStart = dragStartRef.current;
		if (!dragStart) {
			return;
		}

		dragPointerIdRef.current = null;
		dragStartRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		const finalOffsetX = event.clientX - dragStart.x;
		const finalOffsetY = (event.clientY - dragStart.y) * 0.2;
		syncDragOffset({ x: finalOffsetX, y: finalOffsetY });

		if (Math.abs(finalOffsetX) >= SWIPE_THRESHOLD) {
			await animateDecision(finalOffsetX > 0 ? "like" : "pass");
			return;
		}

		syncDragOffset({ x: 0, y: 0 });
		setIsDragging(false);
	};

	const handleOpenChat = async (matchId: string) => {
		setError(null);

		try {
			const data = await requestJson<ChatState>(
				`/api/chats/${matchId}/messages`,
			);
			setActiveChat(data);
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		}
	};

	const handleSendMessage = async () => {
		if (!activeChat || !chatMessage.trim()) {
			return;
		}

		setIsSendingMessage(true);
		setError(null);

		try {
			const data = await requestJson<ChatState>(
				`/api/chats/${activeChat.match.id}/messages`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ body: chatMessage.trim() }),
				},
			);

			setActiveChat(data);
			setChatMessage("");
			await loadAppState();
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		} finally {
			setIsSendingMessage(false);
		}
	};

	const handleReset = async () => {
		setError(null);
		setNotice(null);

		try {
			await requestJson<{ ok: boolean }>("/api/matching/reset", {
				method: "POST",
			});
			setActiveChat(null);
			setActiveCandidateProfile(null);
			setTab("discover");
			setNotice("マッチ履歴をリセットしました。最初からやり直せます。");
			await loadAppState();
		} catch (nextError) {
			setError(toErrorMessage(nextError));
		}
	};

	const profileImage =
		profile?.photos[0]?.url ??
		profile?.image ??
		createFallbackDataUri(session?.user?.name ?? "YOU");
	const matchMomentPhoto = matchMoment
		? (matchMoment.tokuzou.primaryPhotoUrl ??
			matchMoment.tokuzou.photos[0]?.url ??
			createFallbackDataUri(matchMoment.tokuzou.name))
		: null;
	const activeChatPhoto = activeChat
		? (activeChat.match.tokuzou.primaryPhotoUrl ??
			activeChat.match.tokuzou.photos[0]?.url ??
			createFallbackDataUri(activeChat.match.tokuzou.name))
		: null;
	const activeCandidatePhoto = activeCandidateProfile
		? (activeCandidateProfile.primaryPhotoUrl ??
			activeCandidateProfile.photos[0]?.url ??
			createFallbackDataUri(activeCandidateProfile.name))
		: null;

	if (isPending) {
		return (
			<div className="native-shell flex items-center justify-center px-6">
				<div className="glass-panel w-full max-w-sm rounded-[2rem] px-6 py-10 text-center animate-reveal-up">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-soft)]">
						Loading
					</p>
					<p className="mt-3 text-lg text-[var(--ink)]">
						とくぞうを探しています…
					</p>
				</div>
			</div>
		);
	}

	if (!session?.user) {
		return <GuestLanding />;
	}

	return (
		<>
			<div className="native-shell mx-auto flex w-full max-w-md flex-col overflow-hidden bg-white pb-44 pt-0">
				{isDiscoverTab ? (
					<div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 space-y-3">
						{notice ? <Banner tone="success" message={notice} /> : null}
						{error ? <Banner tone="error" message={error} /> : null}
					</div>
				) : (
					<div className="screen-enter border-b border-[var(--line)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--ink-soft)]">
									Love Match
								</p>
								<h1 className="mt-1 text-[2rem] leading-none text-[var(--ink)]">
									{tab === "matches" ? "Matches" : "Profile"}
								</h1>
							</div>
							<button
								type="button"
								onClick={() => {
									void handleReset();
								}}
								className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
							>
								リセット
							</button>
						</div>

						<div className="mt-4 flex items-center justify-between gap-3 text-sm">
							<div>
								<p className="text-sm font-semibold text-[var(--ink)]">
									{session.user.name ?? "あなた"}
								</p>
								<p className="text-xs text-[var(--ink-soft)]">
									{matches.length} matches / 無限のとくぞう
								</p>
							</div>
							<div className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
								{genderLabel(profile?.gender ?? profileForm.gender)}
							</div>
						</div>

						{notice ? <Banner tone="success" message={notice} /> : null}
						{error ? <Banner tone="error" message={error} /> : null}
					</div>
				)}

				<div
					className={`flex-1 overflow-y-auto pb-40 ${isDiscoverTab ? "px-0 pt-[calc(env(safe-area-inset-top)+0.5rem)]" : "px-4 pt-4"}`}
				>
					{isLoading ? (
						<div className="glass-panel rounded-[2rem] px-6 py-16 text-center text-sm text-[var(--ink-soft)]">
							最新のカードを読み込んでいます…
						</div>
					) : !isOnboarded ? (
						<OnboardingPanel
							form={profileForm}
							onChange={setProfileForm}
							onSave={() => {
								void handleProfileSave();
							}}
							isSaving={isSavingProfile}
							lockedGender={profile?.gender ?? preferredGender}
							canChooseGender={!profile && !preferredGender}
						/>
					) : tab === "discover" ? (
						<div className="screen-enter space-y-4 pb-24">
							{candidate ? (
								<div className="relative h-[min(72dvh,46rem)] min-h-[34rem] overflow-hidden bg-[var(--surface-soft)]">
									<div
										key={candidate.candidateId}
										className={`swipe-card absolute inset-0 overflow-hidden bg-[var(--surface-soft)] ${isDragging ? "is-dragging" : ""}`}
										style={{
											transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragRotation}deg)`,
											opacity: isSubmittingDecision ? 0 : 1,
										}}
										onPointerDown={handlePointerDown}
										onPointerMove={handlePointerMove}
										onPointerUp={(event) => {
											void handlePointerEnd(event);
										}}
										onPointerCancel={(event) => {
											void handlePointerEnd(event);
										}}
									>
										{heroPhoto ? (
											<Image
												src={heroPhoto}
												alt={candidate.name}
												fill
												unoptimized
												sizes="(max-width: 768px) 100vw, 420px"
												className="object-cover"
											/>
										) : null}

										<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%,rgba(32,33,36,0.08)_58%,rgba(32,33,36,0.54)_100%)]" />

										{dragDirection === "like" ? (
											<div
												className="swipe-badge like"
												style={{ opacity: dragProgress }}
											>
												Like
											</div>
										) : null}
										{dragDirection === "pass" ? (
											<div
												className="swipe-badge pass"
												style={{ opacity: dragProgress }}
											>
												Pass
											</div>
										) : null}

										<div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-24 text-white">
											<div className="flex items-end justify-between gap-4">
												<div>
													<h2 className="text-[2.4rem] leading-none">
														{candidate.name}
													</h2>
													<p className="mt-2 text-sm font-medium text-white/82">
														{candidate.age}歳 / {candidate.location}
													</p>
												</div>
												<div className="rounded-[1.4rem] bg-white/12 px-3 py-2 text-right backdrop-blur">
													<p className="text-[10px] tracking-[0.2em] text-white/66">
														WORK
													</p>
													<p className="mt-1 text-sm font-medium">
														{candidate.occupation}
													</p>
												</div>
											</div>

											<p className="mt-4 text-sm leading-6 text-white/84">
												{candidate.bio}
											</p>
										</div>
									</div>
								</div>
							) : (
								<EmptyPanel
									title="まだ候補がいません"
									body="管理画面からとくぞう画像を追加すると、ここに無限のカードが流れます。"
								/>
							)}

							<div className="grid grid-cols-3 gap-3 px-4 pb-2 pt-1">
								<ActionButton
									label="見送り"
									icon="×"
									tone="pass"
									onClick={() => {
										void animateDecision("pass");
									}}
									disabled={!candidate || isSubmittingDecision}
								/>
								<ActionButton
									label="プロフィール"
									icon="★"
									tone="info"
									onClick={() => {
										if (candidate) {
											setActiveCandidateProfile(candidate);
										}
									}}
									disabled={!candidate || isSubmittingDecision}
								/>
								<ActionButton
									label="いいかも"
									icon="❤"
									tone="like"
									onClick={() => {
										void animateDecision("like");
									}}
									disabled={!candidate || isSubmittingDecision}
								/>
							</div>
						</div>
					) : tab === "matches" ? (
						<div className="screen-enter space-y-1 pb-32">
							{matches.length > 0 ? (
								matches.map((match) => (
									<button
										type="button"
										key={match.id}
										onClick={() => {
											void handleOpenChat(match.id);
										}}
										className="flex w-full items-center gap-4 border-b border-[var(--line)] px-1 py-4 text-left"
									>
										<Image
											src={
												match.tokuzou.primaryPhotoUrl ??
												match.tokuzou.photos[0]?.url ??
												createFallbackDataUri(match.tokuzou.name)
											}
											alt={match.tokuzou.name}
											width={68}
											height={68}
											unoptimized
											className="h-[68px] w-[68px] rounded-[1.2rem] object-cover"
										/>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-3">
												<p className="truncate text-base font-semibold text-[var(--ink)]">
													{match.tokuzou.name}
												</p>
												<p className="text-xs text-[var(--ink-soft)]">
													{formatDate(match.updatedAt)}
												</p>
											</div>
											<p className="mt-1 truncate text-sm text-[var(--ink-soft)]">
												{match.latestMessage ??
													`${match.tokuzou.location} / ${match.tokuzou.occupation}`}
											</p>
										</div>
									</button>
								))
							) : (
								<EmptyPanel
									title="まだマッチがありません"
									body="スワイプで『いいかも』すると、ここに会話一覧が増えていきます。"
								/>
							)}
						</div>
					) : (
						<div className="screen-enter space-y-6 pb-40">
							<div className="px-1 pt-1">
								<input
									ref={photoInputRef}
									type="file"
									accept="image/*"
									onChange={(event) => {
										void handleProfilePhotoChange(event);
									}}
									className="hidden"
								/>
								<div className="flex items-center gap-4">
									<div className="relative h-24 w-24 overflow-hidden rounded-[1.7rem] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
										<Image
											src={profileImage}
											alt="プロフィール画像"
											fill
											unoptimized
											className="object-cover"
										/>
									</div>
									<div>
										<h2 className="text-[2rem] leading-none text-[var(--ink)]">
											{session.user.name ?? "あなた"}
										</h2>
										<p className="mt-2 text-sm text-[var(--ink-soft)]">
											{session.user.email}
										</p>
									</div>
								</div>

								<div className="mt-4 grid grid-cols-2 gap-3">
									<InfoPill label="マッチ数" value={`${matches.length}件`} />
									<InfoPill
										label="現在の性別"
										value={genderLabel(profile?.gender ?? profileForm.gender)}
									/>
								</div>

								<div className="mt-5 flex gap-3">
									<button
										type="button"
										onClick={handlePickProfilePhoto}
										disabled={isUploadingPhoto}
										className="flex-1 rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
									>
										{isUploadingPhoto ? "処理中…" : "写真を変更"}
									</button>
									<button
										type="button"
										onClick={() => {
											void handleResetProfilePhoto();
										}}
										disabled={isUploadingPhoto}
										className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:opacity-40"
									>
										初期画像
									</button>
								</div>
							</div>

							<OnboardingPanel
								compact
								form={profileForm}
								onChange={setProfileForm}
								onSave={() => {
									void handleProfileSave();
								}}
								isSaving={isSavingProfile}
								lockedGender={profile?.gender ?? preferredGender}
								canChooseGender={!profile && !preferredGender}
							/>
						</div>
					)}
				</div>

				<div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-3">
					<div className="mx-auto grid max-w-[22rem] grid-cols-3 gap-1.5">
						<TabButton
							label="Swipe"
							active={tab === "discover"}
							onClick={() => setTab("discover")}
						/>
						<TabButton
							label="Matches"
							active={tab === "matches"}
							onClick={() => setTab("matches")}
						/>
						<TabButton
							label="Profile"
							active={tab === "profile"}
							onClick={() => setTab("profile")}
						/>
					</div>
				</div>
			</div>

			{matchMoment ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,24,39,0.28)] px-6 backdrop-blur-[2px]">
					<div className="match-burst relative w-full max-w-sm overflow-hidden rounded-[2.2rem] border border-[var(--line)] bg-white px-6 py-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
						<div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-[0_18px_40px_rgba(62,26,49,0.22)]">
							<Image
								src={
									matchMomentPhoto ??
									createFallbackDataUri(matchMoment.tokuzou.name)
								}
								alt={matchMoment.tokuzou.name}
								width={112}
								height={112}
								unoptimized
								className="h-full w-full object-cover"
							/>
						</div>
						<p className="mt-5 text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">
							MATCHED
						</p>
						<h2 className="mt-2 text-4xl text-[var(--ink)]">
							{matchMoment.tokuzou.name}
						</h2>
						<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
							新しいとくぞうとの会話が始まりました。メッセージタブから続きをどうぞ。
						</p>
					</div>
				</div>
			) : null}

			{activeCandidateProfile ? (
				<div className="fixed inset-0 z-50 bg-white">
					<div className="native-shell mx-auto flex h-full w-full max-w-md flex-col overflow-y-auto px-4 pb-8 pt-4">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--ink-soft)]">
									Tokuzou Profile
								</p>
								<h2 className="mt-2 text-[2rem] leading-none text-[var(--ink)]">
									{activeCandidateProfile.name}
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setActiveCandidateProfile(null)}
								className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
							>
								閉じる
							</button>
						</div>

						<div className="relative mt-5 aspect-[0.8] overflow-hidden rounded-[2rem] bg-[var(--surface-soft)] shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
							{activeCandidatePhoto ? (
								<Image
									src={activeCandidatePhoto}
									alt={activeCandidateProfile.name}
									fill
									unoptimized
									sizes="(max-width: 768px) 100vw, 420px"
									className="object-cover"
								/>
							) : null}
							<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_36%,rgba(32,33,36,0.14)_62%,rgba(32,33,36,0.6)_100%)]" />
							<div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-24 text-white">
								<p className="text-[2.4rem] leading-none">
									{activeCandidateProfile.name}
								</p>
								<p className="mt-2 text-sm font-medium text-white/82">
									{activeCandidateProfile.age}歳 /{" "}
									{activeCandidateProfile.location}
								</p>
							</div>
						</div>

						<div className="mt-5 grid grid-cols-2 gap-3">
							<InfoPill
								label="住んでいる場所"
								value={activeCandidateProfile.location}
							/>
							<InfoPill
								label="職業"
								value={activeCandidateProfile.occupation}
							/>
						</div>

						<div className="mt-5 rounded-[1.6rem] bg-[var(--surface-soft)] px-5 py-5">
							<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
								About
							</p>
							<p className="mt-3 text-sm leading-7 text-[var(--ink)]">
								{activeCandidateProfile.bio}
							</p>
						</div>
					</div>
				</div>
			) : null}

			{activeChat ? (
				<div className="fixed inset-0 z-50 bg-white">
					<div className="native-shell mx-auto flex h-full w-full max-w-md flex-col px-4 pb-4 pt-4">
						<div className="glass-panel flex items-center gap-4 rounded-[1.8rem] px-4 py-4">
							<Image
								src={
									activeChatPhoto ??
									createFallbackDataUri(activeChat.match.tokuzou.name)
								}
								alt={activeChat.match.tokuzou.name}
								width={52}
								height={52}
								unoptimized
								className="h-[52px] w-[52px] rounded-[1.1rem] object-cover"
							/>
							<div className="min-w-0 flex-1">
								<p className="text-base font-semibold text-[var(--ink)]">
									{activeChat.match.tokuzou.name}
								</p>
								<p className="truncate text-sm text-[var(--ink-soft)]">
									{activeChat.match.tokuzou.location} /{" "}
									{activeChat.match.tokuzou.occupation}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setActiveChat(null)}
								className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
							>
								閉じる
							</button>
						</div>

						<div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
							{activeChat.messages.map((message) => (
								<div
									key={message.id}
									className={`max-w-[82%] rounded-[1.6rem] px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)] ${message.isMe ? "ml-auto bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white text-[var(--ink)]"}`}
								>
									<p
										className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${message.isMe ? "text-white/70" : "text-[var(--ink-soft)]"}`}
									>
										{message.senderName}
									</p>
									<p className="mt-2 text-sm leading-6">{message.body}</p>
								</div>
							))}
						</div>

						<div className="glass-panel rounded-[1.8rem] p-3">
							<div className="flex items-end gap-3">
								<textarea
									value={chatMessage}
									onChange={(event) => setChatMessage(event.target.value)}
									rows={2}
									placeholder="メッセージを入力"
									className="min-h-16 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
								/>
								<button
									type="button"
									onClick={() => {
										void handleSendMessage();
									}}
									disabled={isSendingMessage || !chatMessage.trim()}
									className="rounded-[1.2rem] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
								>
									{isSendingMessage ? "送信中" : "送信"}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}

function GuestLanding() {
	return (
		<div className="native-shell mx-auto flex w-full max-w-md flex-col justify-between px-4 pb-8 pt-6">
			<div className="animate-reveal-up">
				<div className="py-4 text-[var(--ink)]">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-soft)]">
						とくぞうと、新しい生活へ
					</p>
					<h1 className="mt-3 text-5xl leading-[0.92]">
						無限のとくぞうを、
						<br />
						スワイプする。
					</h1>
					<p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
						ここでの出会いはあなたを変えるかもしれません。さあ、スワイプしてとくぞうを見つけましょう。
					</p>
				</div>

				<div className="mt-5 grid gap-3">
					<Link
						href="/signup"
						className="rounded-full bg-[var(--ink)] px-5 py-4 text-center text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)]"
					>
						新規登録して始める
					</Link>
					<Link
						href="/login"
						className="rounded-full border border-black/8 bg-white px-5 py-4 text-center text-sm font-semibold text-[var(--ink)] shadow-[0_12px_24px_rgba(15,23,42,0.06)]"
					>
						ログイン
					</Link>
				</div>
			</div>
		</div>
	);
}

function OnboardingPanel(props: {
	form: ProfileFormState;
	onChange: Dispatch<SetStateAction<ProfileFormState>>;
	onSave: () => void;
	isSaving: boolean;
	lockedGender: Gender | null;
	canChooseGender: boolean;
	compact?: boolean;
}) {
	const {
		compact = false,
		form,
		onChange,
		onSave,
		isSaving,
		lockedGender,
		canChooseGender,
	} = props;

	return (
		<div className="screen-enter border-t border-[var(--line)] pt-6">
			<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--ink-soft)]">
				{compact ? "Profile Edit" : "Onboarding"}
			</p>
			<h2 className="mt-2 text-[2rem] leading-none text-[var(--ink)]">
				{compact ? "プロフィールを整える" : "まずは基本情報を入力"}
			</h2>
			<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
				プロフィールを登録すると、よりあなたに合ったとくぞうが表示されやすくなります。
			</p>

			<div className="mt-5 rounded-[1.2rem] bg-[var(--surface-soft)] p-4">
				<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
					登録性別
				</p>
				{canChooseGender ? (
					<div className="mt-3 grid grid-cols-2 gap-3">
						{(["male", "female"] as const).map((gender) => (
							<button
								type="button"
								key={gender}
								onClick={() => onChange((current) => ({ ...current, gender }))}
								className={`rounded-full px-4 py-3 text-sm font-semibold transition ${form.gender === gender ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--ink-soft)]"}`}
							>
								{genderLabel(gender)}
							</button>
						))}
					</div>
				) : (
					<div className="mt-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]">
						{genderLabel(lockedGender ?? form.gender)}
					</div>
				)}
			</div>

			<div className="mt-4 grid gap-3">
				<Field label="年齢">
					<input
						value={form.age}
						onChange={(event) =>
							onChange((current) => ({ ...current, age: event.target.value }))
						}
						inputMode="numeric"
						className="profile-input"
					/>
				</Field>
				<Field label="居住地">
					<input
						value={form.location}
						onChange={(event) =>
							onChange((current) => ({
								...current,
								location: event.target.value,
							}))
						}
						className="profile-input"
					/>
				</Field>
				<Field label="仕事">
					<input
						value={form.occupation}
						onChange={(event) =>
							onChange((current) => ({
								...current,
								occupation: event.target.value,
							}))
						}
						className="profile-input"
					/>
				</Field>
				<Field label="自己紹介">
					<textarea
						value={form.bio}
						onChange={(event) =>
							onChange((current) => ({ ...current, bio: event.target.value }))
						}
						rows={4}
						className="profile-input min-h-28 resize-none"
					/>
				</Field>
			</div>

			<div className="mt-6 pt-2">
				<button
					type="button"
					onClick={onSave}
					disabled={isSaving}
					className="w-full rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(253,80,104,0.22)] disabled:opacity-40"
				>
					{isSaving ? "保存中…" : compact ? "更新する" : "スワイプを始める"}
				</button>
			</div>
		</div>
	);
}

function Banner(props: { tone: "success" | "error"; message: string }) {
	return (
		<div
			className={`mt-4 rounded-[1.1rem] border px-4 py-3 text-sm ${props.tone === "success" ? "border-[rgba(37,194,138,0.18)] bg-[rgba(37,194,138,0.08)] text-[var(--ink)]" : "border-[rgba(213,83,83,0.18)] bg-[rgba(213,83,83,0.06)] text-[var(--danger)]"}`}
		>
			{props.message}
		</div>
	);
}

function EmptyPanel(props: { title: string; body: string }) {
	return (
		<div className="px-4 py-12 text-center">
			<h2 className="text-2xl text-[var(--ink)]">{props.title}</h2>
			<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
				{props.body}
			</p>
		</div>
	);
}

function ActionButton(props: {
	label: string;
	icon: string;
	tone: "pass" | "info" | "like";
	onClick: () => void;
	disabled?: boolean;
}) {
	const color =
		props.tone === "like"
			? "text-[var(--like)]"
			: props.tone === "pass"
				? "text-[var(--pass)]"
				: "text-[var(--info)]";

	return (
		<button
			type="button"
			onClick={props.onClick}
			disabled={props.disabled}
			className="flex flex-col items-center gap-2 rounded-[1.2rem] bg-[var(--surface-soft)] px-3 py-3.5 disabled:opacity-40"
		>
			<span
				className={`flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-soft)] text-3xl ${color}`}
			>
				{props.icon}
			</span>
			<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
				{props.label}
			</span>
		</button>
	);
}

function TabButton(props: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={props.onClick}
			className={`rounded-[1rem] px-3 py-3 text-sm font-semibold transition ${props.active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-soft)] hover:bg-[var(--surface-soft)]"}`}
		>
			{props.label}
		</button>
	);
}

function Field(props: { label: string; children: ReactNode }) {
	return (
		<div>
			<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
				{props.label}
			</p>
			{props.children}
		</div>
	);
}

function InfoPill(props: { label: string; value: string }) {
	return (
		<div className="rounded-[1rem] bg-[var(--surface-soft)] px-4 py-3">
			<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
				{props.label}
			</p>
			<p className="mt-1 text-sm font-semibold text-[var(--ink)]">
				{props.value}
			</p>
		</div>
	);
}

async function requestJson<T>(input: string, init?: RequestInit) {
	const response = await fetch(input, {
		cache: "no-store",
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

function createFallbackDataUri(label: string) {
	const safe = encodeURIComponent(label.slice(0, 18) || "YOU");
	return `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23ff6b5f'/%3E%3Cstop offset='1' stop-color='%23ffb067'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='480' height='480' rx='48' fill='url(%23g)'/%3E%3Ccircle cx='240' cy='172' r='86' fill='rgba(255,255,255,0.3)'/%3E%3Cpath d='M112 386c26-92 78-140 128-140s102 48 128 140' fill='rgba(255,255,255,0.36)'/%3E%3Ctext x='240' y='432' fill='white' font-size='38' font-family='Verdana, sans-serif' text-anchor='middle'%3E${safe}%3C/text%3E%3C/svg%3E`;
}

function createCardDemoDataUri() {
	return "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 720 980'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23f96d5d'/%3E%3Cstop offset='1' stop-color='%23f1b35c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='720' height='980' fill='%230c1118'/%3E%3Crect x='48' y='70' width='624' height='840' rx='52' fill='url(%23g)'/%3E%3Ccircle cx='360' cy='292' r='138' fill='rgba(255,255,255,0.22)'/%3E%3Ccircle cx='360' cy='258' r='86' fill='rgba(255,255,255,0.38)'/%3E%3Cpath d='M184 742c38-132 102-198 176-198s138 66 176 198' fill='rgba(255,255,255,0.38)'/%3E%3Crect x='92' y='96' width='130' height='40' rx='20' fill='rgba(12,17,24,0.18)'/%3E%3Crect x='520' y='96' width='108' height='40' rx='20' fill='rgba(12,17,24,0.18)'/%3E%3Ctext x='120' y='806' fill='white' font-family='Georgia, serif' font-size='74'%E7%B4%97%E5%AD%A3%3C/text%3E%3Ctext x='120' y='854' fill='rgba(255,255,255,0.82)' font-family='Verdana, sans-serif' font-size='28'%E6%B8%8B%E8%B0%B7%20/%20PR%E3%83%97%E3%83%A9%E3%83%B3%E3%83%8A%E3%83%BC%3C/text%3E%3C/svg%3E";
}

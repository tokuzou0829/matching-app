import { and, asc, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db";

export const genderSchema = z.enum(["male", "female"]);
export const matchActionSchema = z.enum(["like", "pass"]);

export type Gender = z.infer<typeof genderSchema>;
export type MatchAction = z.infer<typeof matchActionSchema>;

type ProfileInput = {
	gender: Gender;
	age: number;
	location: string;
	occupation: string;
	bio: string;
};

const USER_PHOTO_MAX_BYTES = 350_000;
const TOKUZOU_ASSET_MAX_BYTES = 500_000;
const GENERATED_MATCH_RATE_PERCENT = 37;

type GeneratedCandidateSnapshot = {
	candidateId: string;
	assetId: string;
	gender: Gender;
	name: string;
	age: number;
	location: string;
	occupation: string;
	bio: string;
	imageUrl: string;
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
	photos: Array<{
		id: string;
		url: string;
		isPrimary: boolean;
	}>;
	primaryPhotoUrl: string | null;
};

type MatchSummary = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	tokuzou: PublicProfile;
	latestMessage: string | null;
};

type ChatState = {
	match: MatchSummary;
	messages: Array<{
		id: string;
		body: string;
		createdAt: Date;
		isMe: boolean;
		senderName: string;
	}>;
};

type TokuzouAssetSummary = {
	id: string;
	gender: Gender;
	imageUrl: string;
	sortOrder: number;
	createdAt: Date;
};

const TOKUZOU_NAME = "とくぞう";

const LOCATION_POOL = [
	"渋谷",
	"下北沢",
	"中目黒",
	"吉祥寺",
	"横浜",
	"恵比寿",
	"代々木上原",
	"自由が丘",
];

const OCCUPATION_POOL: Record<Gender, string[]> = {
	male: [
		"映像ディレクター",
		"プロダクトデザイナー",
		"カフェオーナー",
		"建築士",
		"編集者",
		"アプリエンジニア",
		"フォトグラファー",
		"ブランド企画",
	],
	female: [
		"グラフィックデザイナー",
		"フードスタイリスト",
		"PRプランナー",
		"ギャラリーキュレーター",
		"UIデザイナー",
		"旅行編集者",
		"コスメ企画",
		"空間スタイリスト",
	],
};

const VIBE_POOL = [
	"夜の散歩",
	"落ち着いたカフェ",
	"ちょっといい朝ごはん",
	"映画のあとに感想を話す時間",
	"海沿いドライブ",
	"美術館デート",
	"古着屋めぐり",
	"静かなバー",
];

const PERSONALITY_POOL = [
	"自然体で笑える関係が好きです。",
	"気取らない会話がいちばん落ち着きます。",
	"ちゃんと向き合って話せる人に惹かれます。",
	"テンポの合う相手と長く仲良くなりたいです。",
	"忙しくても、お互いに余白を大切にしたいです。",
	"一緒にいると空気がやわらぐ人が理想です。",
];

export async function getMyProfile(db: Database, userId: string) {
	const profile = await getProfileRecord(db, userId);
	if (!profile) {
		return null;
	}

	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	const photos = await listPhotoRows(db, userId);

	return {
		userId: user.id,
		name: user.name,
		email: user.email,
		image: user.image,
		gender: toGender(profile.gender),
		discoveryCursor: profile.discoveryCursor,
		age: profile.age,
		location: profile.location,
		occupation: profile.occupation,
		bio: profile.bio,
		onboardingCompleted: profile.onboardingCompleted,
		isTokuzou: profile.isTokuzou,
		photos: photos.map((photo) => ({
			id: photo.id,
			url: photo.imageUrl,
			isPrimary: photo.isPrimary,
		})),
	};
}

export async function initializeMyProfileGender(
	db: Database,
	userId: string,
	gender: Gender,
) {
	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	const existingProfile = await getProfileRecord(db, userId);
	if (existingProfile) {
		const currentGender = toGender(existingProfile.gender);
		if (currentGender !== gender) {
			throw new HTTPException(400, {
				message: "登録後に性別は変更できません。",
			});
		}

		return getMyProfile(db, userId);
	}

	await db.insert(schema.profile).values({
		userId,
		gender,
		age: 18,
		location: "",
		occupation: "",
		bio: "",
		onboardingCompleted: false,
		isTokuzou: false,
	});

	await ensureUserHasPhoto(db, userId, user.name, gender);

	return getMyProfile(db, userId);
}

export async function upsertMyProfile(
	db: Database,
	userId: string,
	input: ProfileInput,
) {
	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	const existingProfile = await getProfileRecord(db, userId);
	if (existingProfile && toGender(existingProfile.gender) !== input.gender) {
		throw new HTTPException(400, {
			message: "登録後に性別は変更できません。",
		});
	}

	await db
		.insert(schema.profile)
		.values({
			userId,
			gender: input.gender,
			age: input.age,
			location: input.location,
			occupation: input.occupation,
			bio: input.bio,
			onboardingCompleted: true,
			isTokuzou: false,
		})
		.onConflictDoUpdate({
			target: schema.profile.userId,
			set: {
				age: input.age,
				location: input.location,
				occupation: input.occupation,
				bio: input.bio,
				onboardingCompleted: true,
			},
		});

	await ensureUserHasPhoto(db, userId, user.name, input.gender);

	return getMyProfile(db, userId);
}

export async function updateMyProfilePhoto(
	db: Database,
	userId: string,
	dataUrl: string,
) {
	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	validateStoredImageDataUrl(dataUrl, USER_PHOTO_MAX_BYTES);
	await saveSingleUserPhoto(db, userId, dataUrl);

	return getMyProfile(db, userId);
}

export async function resetMyProfilePhoto(db: Database, userId: string) {
	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	const profile = await getProfileRecord(db, userId);
	if (!profile) {
		throw new HTTPException(400, {
			message: "先にプロフィール登録を完了してください。",
		});
	}

	const imageUrl = createDefaultUserPhoto(user.name, toGender(profile.gender));
	await saveSingleUserPhoto(db, userId, imageUrl);

	return getMyProfile(db, userId);
}

export async function listTokuzouAssets(db: Database, gender?: Gender) {
	const rows = await listTokuzouAssetRows(db, gender);

	return rows.map((row) => ({
		id: row.id,
		gender: toGender(row.gender),
		imageUrl: row.imageUrl,
		sortOrder: row.sortOrder,
		createdAt: row.createdAt,
	})) satisfies TokuzouAssetSummary[];
}

export async function addTokuzouAssets(
	db: Database,
	gender: Gender,
	imageUrls: string[],
) {
	if (imageUrls.length === 0) {
		throw new HTTPException(400, {
			message: "画像を1枚以上指定してください。",
		});
	}

	const currentRows = await listTokuzouAssetRows(db, gender);
	const nextOffset = currentRows.length;

	for (const imageUrl of imageUrls) {
		validateStoredImageDataUrl(imageUrl, TOKUZOU_ASSET_MAX_BYTES);
	}

	await db.insert(schema.tokuzouAsset).values(
		imageUrls.map((imageUrl, index) => ({
			id: uuidv7(),
			gender,
			fileId: null,
			imageUrl,
			sortOrder: nextOffset + index,
		})),
	);

	return listTokuzouAssets(db, gender);
}

export async function deleteTokuzouAsset(db: Database, assetId: string) {
	const rows = await db
		.select()
		.from(schema.tokuzouAsset)
		.where(eq(schema.tokuzouAsset.id, assetId))
		.limit(1);

	const asset = rows[0];
	if (!asset) {
		throw new HTTPException(404, { message: "画像が見つかりません。" });
	}

	await db
		.delete(schema.tokuzouAsset)
		.where(eq(schema.tokuzouAsset.id, assetId));

	const remaining = await listTokuzouAssetRows(db, toGender(asset.gender));
	for (const [index, row] of remaining.entries()) {
		if (row.sortOrder === index) {
			continue;
		}

		await db
			.update(schema.tokuzouAsset)
			.set({ sortOrder: index })
			.where(eq(schema.tokuzouAsset.id, row.id));
	}

	return {
		gender: toGender(asset.gender),
		assets: await listTokuzouAssets(db, toGender(asset.gender)),
	};
}

export async function getDiscoveryState(db: Database, userId: string) {
	const me = await getMyProfile(db, userId);
	if (!me || !me.onboardingCompleted) {
		return {
			requiresOnboarding: true,
			candidate: null,
		};
	}

	const targetGender = getTokuzouTargetGender(me.gender);
	const assets = await listTokuzouAssetRows(db, targetGender);
	if (assets.length === 0) {
		return {
			requiresOnboarding: false,
			candidate: null,
		};
	}

	const asset = assets[me.discoveryCursor % assets.length];
	const variantIndex = Math.floor(me.discoveryCursor / assets.length);
	const snapshot = buildGeneratedCandidateSnapshot(asset, variantIndex);

	return {
		requiresOnboarding: false,
		candidate: toGeneratedPublicProfile(snapshot),
	};
}

export async function applyMatchDecision(
	db: Database,
	userId: string,
	candidateId: string,
	action: MatchAction,
) {
	const me = await getMyProfile(db, userId);
	if (!me || !me.onboardingCompleted) {
		throw new HTTPException(400, {
			message: "プロフィール登録を完了してください。",
		});
	}

	const parsedCandidate = parseCandidateId(candidateId);
	const assetRows = await db
		.select()
		.from(schema.tokuzouAsset)
		.where(eq(schema.tokuzouAsset.id, parsedCandidate.assetId))
		.limit(1);
	const asset = assetRows[0];
	if (!asset) {
		throw new HTTPException(404, { message: "おすすめ候補が見つかりません。" });
	}

	const targetGender = getTokuzouTargetGender(me.gender);
	if (toGender(asset.gender) !== targetGender) {
		throw new HTTPException(400, {
			message: "表示できるのは異性のとくぞうだけです。",
		});
	}

	const snapshot = buildGeneratedCandidateSnapshot(
		asset,
		parsedCandidate.variantIndex,
	);

	await db.insert(schema.tokuzouGeneratedAction).values({
		id: uuidv7(),
		userId,
		candidateId: snapshot.candidateId,
		assetId: snapshot.assetId,
		action,
		candidateGender: snapshot.gender,
		candidateName: snapshot.name,
		candidateAge: snapshot.age,
		candidateLocation: snapshot.location,
		candidateOccupation: snapshot.occupation,
		candidateBio: snapshot.bio,
		candidateImageUrl: snapshot.imageUrl,
	});

	await db
		.update(schema.profile)
		.set({
			discoveryCursor: sql`${schema.profile.discoveryCursor} + 1`,
		})
		.where(eq(schema.profile.userId, userId));

	if (
		action === "pass" ||
		!shouldCreateGeneratedMatch(userId, snapshot.candidateId)
	) {
		return {
			matched: false,
			match: null,
		};
	}

	await db
		.insert(schema.tokuzouGeneratedMatch)
		.values({
			id: uuidv7(),
			userId,
			candidateId: snapshot.candidateId,
			assetId: snapshot.assetId,
			candidateGender: snapshot.gender,
			candidateName: snapshot.name,
			candidateAge: snapshot.age,
			candidateLocation: snapshot.location,
			candidateOccupation: snapshot.occupation,
			candidateBio: snapshot.bio,
			candidateImageUrl: snapshot.imageUrl,
		})
		.onConflictDoNothing();

	const matches = await db
		.select()
		.from(schema.tokuzouGeneratedMatch)
		.where(
			and(
				eq(schema.tokuzouGeneratedMatch.userId, userId),
				eq(schema.tokuzouGeneratedMatch.candidateId, snapshot.candidateId),
			),
		)
		.limit(1);
	const match = matches[0];

	if (!match) {
		throw new HTTPException(500, { message: "マッチの作成に失敗しました。" });
	}

	const existingMessages = await db
		.select({ id: schema.tokuzouGeneratedMessage.id })
		.from(schema.tokuzouGeneratedMessage)
		.where(eq(schema.tokuzouGeneratedMessage.matchId, match.id))
		.limit(1);

	if (existingMessages.length === 0) {
		await db.insert(schema.tokuzouGeneratedMessage).values({
			id: uuidv7(),
			matchId: match.id,
			sender: "tokuzou",
			senderName: snapshot.name,
			body: createWelcomeMessage(snapshot.name, snapshot.gender),
			isRead: false,
		});
	}

	return {
		matched: true,
		match: await serializeGeneratedMatch(db, match),
	};
}

export async function listMatchesForUser(db: Database, userId: string) {
	const matches = await db
		.select()
		.from(schema.tokuzouGeneratedMatch)
		.where(eq(schema.tokuzouGeneratedMatch.userId, userId))
		.orderBy(desc(schema.tokuzouGeneratedMatch.updatedAt));

	return Promise.all(
		matches.map((match) => serializeGeneratedMatch(db, match)),
	);
}

export async function getChatForUser(
	db: Database,
	userId: string,
	matchId: string,
): Promise<ChatState> {
	const matches = await db
		.select()
		.from(schema.tokuzouGeneratedMatch)
		.where(
			and(
				eq(schema.tokuzouGeneratedMatch.id, matchId),
				eq(schema.tokuzouGeneratedMatch.userId, userId),
			),
		)
		.limit(1);
	const match = matches[0];

	if (!match) {
		throw new HTTPException(404, { message: "マッチが見つかりません。" });
	}

	const messages = await db
		.select()
		.from(schema.tokuzouGeneratedMessage)
		.where(eq(schema.tokuzouGeneratedMessage.matchId, matchId))
		.orderBy(asc(schema.tokuzouGeneratedMessage.createdAt));

	return {
		match: await serializeGeneratedMatch(db, match),
		messages: messages.map((message) => ({
			id: message.id,
			body: message.body,
			createdAt: message.createdAt,
			isMe: message.sender === "user",
			senderName: message.senderName,
		})),
	};
}

export async function sendMessageAsUser(
	db: Database,
	userId: string,
	matchId: string,
	body: string,
) {
	const matches = await db
		.select()
		.from(schema.tokuzouGeneratedMatch)
		.where(
			and(
				eq(schema.tokuzouGeneratedMatch.id, matchId),
				eq(schema.tokuzouGeneratedMatch.userId, userId),
			),
		)
		.limit(1);
	const match = matches[0];

	if (!match) {
		throw new HTTPException(404, { message: "マッチが見つかりません。" });
	}

	const user = await getUserRecord(db, userId);
	if (!user) {
		throw new HTTPException(404, { message: "ユーザーが見つかりません。" });
	}

	await db.insert(schema.tokuzouGeneratedMessage).values({
		id: uuidv7(),
		matchId,
		sender: "user",
		senderName: user.name ?? "You",
		body,
		isRead: true,
	});

	await db.insert(schema.tokuzouGeneratedMessage).values({
		id: uuidv7(),
		matchId,
		sender: "tokuzou",
		senderName: match.candidateName,
		body: createTokuzouReply(
			body,
			toGender(match.candidateGender),
			match.candidateName,
		),
		isRead: false,
	});

	await db
		.update(schema.tokuzouGeneratedMatch)
		.set({ updatedAt: new Date() })
		.where(eq(schema.tokuzouGeneratedMatch.id, matchId));

	return getChatForUser(db, userId, matchId);
}

export async function resetTokuzouJourney(db: Database, userId: string) {
	await db
		.delete(schema.tokuzouGeneratedAction)
		.where(eq(schema.tokuzouGeneratedAction.userId, userId));
	await db
		.update(schema.profile)
		.set({ discoveryCursor: 0 })
		.where(eq(schema.profile.userId, userId));
	await db
		.delete(schema.tokuzouGeneratedMatch)
		.where(eq(schema.tokuzouGeneratedMatch.userId, userId));
	await db
		.delete(schema.matchAction)
		.where(eq(schema.matchAction.actorUserId, userId));
	await db
		.delete(schema.tokuzouMatch)
		.where(eq(schema.tokuzouMatch.userId, userId));

	return {
		ok: true,
	};
}

async function serializeGeneratedMatch(
	db: Database,
	match: typeof schema.tokuzouGeneratedMatch.$inferSelect,
): Promise<MatchSummary> {
	const latestMessage = await db
		.select({ body: schema.tokuzouGeneratedMessage.body })
		.from(schema.tokuzouGeneratedMessage)
		.where(eq(schema.tokuzouGeneratedMessage.matchId, match.id))
		.orderBy(desc(schema.tokuzouGeneratedMessage.createdAt))
		.limit(1);

	return {
		id: match.id,
		createdAt: match.createdAt,
		updatedAt: match.updatedAt,
		tokuzou: {
			userId: match.candidateId,
			candidateId: match.candidateId,
			name: match.candidateName,
			gender: toGender(match.candidateGender),
			age: match.candidateAge,
			location: match.candidateLocation,
			occupation: match.candidateOccupation,
			bio: match.candidateBio,
			isTokuzou: true,
			photos: [
				{
					id: match.assetId,
					url: match.candidateImageUrl,
					isPrimary: true,
				},
			],
			primaryPhotoUrl: match.candidateImageUrl,
		},
		latestMessage: latestMessage[0]?.body ?? null,
	};
}

async function getUserRecord(db: Database, userId: string) {
	const rows = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.limit(1);

	return rows[0] ?? null;
}

async function getProfileRecord(db: Database, userId: string) {
	const rows = await db
		.select()
		.from(schema.profile)
		.where(eq(schema.profile.userId, userId))
		.limit(1);

	return rows[0] ?? null;
}

async function listPhotoRows(db: Database, userId: string) {
	return db
		.select()
		.from(schema.profilePhoto)
		.where(eq(schema.profilePhoto.userId, userId))
		.orderBy(
			asc(schema.profilePhoto.sortOrder),
			asc(schema.profilePhoto.createdAt),
		);
}

async function listTokuzouAssetRows(db: Database, gender?: Gender) {
	if (gender) {
		return db
			.select()
			.from(schema.tokuzouAsset)
			.where(eq(schema.tokuzouAsset.gender, gender))
			.orderBy(
				asc(schema.tokuzouAsset.sortOrder),
				asc(schema.tokuzouAsset.createdAt),
			);
	}

	return db
		.select()
		.from(schema.tokuzouAsset)
		.orderBy(
			asc(schema.tokuzouAsset.gender),
			asc(schema.tokuzouAsset.sortOrder),
			asc(schema.tokuzouAsset.createdAt),
		);
}

async function ensureUserHasPhoto(
	db: Database,
	userId: string,
	name: string,
	gender: Gender,
) {
	const currentPhotos = await listPhotoRows(db, userId);
	if (currentPhotos.length > 0) {
		await db
			.update(schema.user)
			.set({ image: currentPhotos[0].imageUrl })
			.where(eq(schema.user.id, userId));
		return;
	}

	await saveSingleUserPhoto(db, userId, createDefaultUserPhoto(name, gender));
}

async function saveSingleUserPhoto(
	db: Database,
	userId: string,
	imageUrl: string,
) {
	const currentPhotos = await listPhotoRows(db, userId);

	if (currentPhotos.length > 0) {
		await db
			.update(schema.profilePhoto)
			.set({
				imageUrl,
				sortOrder: 0,
				isPrimary: true,
			})
			.where(eq(schema.profilePhoto.id, currentPhotos[0].id));

		if (currentPhotos.length > 1) {
			for (const photo of currentPhotos.slice(1)) {
				await db
					.delete(schema.profilePhoto)
					.where(eq(schema.profilePhoto.id, photo.id));
			}
		}
	} else {
		await db.insert(schema.profilePhoto).values({
			id: uuidv7(),
			userId,
			imageUrl,
			sortOrder: 0,
			isPrimary: true,
		});
	}

	await db
		.update(schema.user)
		.set({ image: imageUrl })
		.where(eq(schema.user.id, userId));
}

export function validateStoredImageDataUrl(dataUrl: string, maxBytes: number) {
	const normalized = dataUrl.trim();
	const isValid =
		/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(
			normalized,
		);

	if (!isValid) {
		throw new HTTPException(400, {
			message: "画像データの形式が不正です。",
		});
	}

	if (Buffer.byteLength(normalized, "utf8") > maxBytes) {
		throw new HTTPException(400, {
			message: "画像サイズが大きすぎます。もう少し小さな画像を選んでください。",
		});
	}
}

function createDefaultUserPhoto(name: string, gender: Gender) {
	return createPortraitDataUri({
		label: name.slice(0, 24) || "YOU",
		subtitle: gender === "male" ? "とくぞう待機中" : "運命の前夜",
		start: gender === "male" ? "#2f4f65" : "#7a3d5b",
		end: gender === "male" ? "#e7b979" : "#ffb58a",
	});
}

function buildGeneratedCandidateSnapshot(
	asset: typeof schema.tokuzouAsset.$inferSelect,
	variantIndex: number,
): GeneratedCandidateSnapshot {
	const gender = toGender(asset.gender);
	const candidateId = `${asset.id}:${variantIndex + 1}`;
	const seed = createSeed(`${candidateId}:${asset.imageUrl}`);

	const location = pickFromPool(LOCATION_POOL, seed + 3);
	const occupation = pickFromPool(OCCUPATION_POOL[gender], seed + 7);
	const vibe = pickFromPool(VIBE_POOL, seed + 13);
	const personality = pickFromPool(PERSONALITY_POOL, seed + 17);

	return {
		candidateId,
		assetId: asset.id,
		gender,
		name: TOKUZOU_NAME,
		age: 23 + (seed % 11),
		location,
		occupation,
		bio: `${vibe}が似合うタイプです。${personality}`,
		imageUrl: asset.imageUrl,
	};
}

function toGeneratedPublicProfile(
	snapshot: GeneratedCandidateSnapshot,
): PublicProfile {
	return {
		userId: snapshot.candidateId,
		candidateId: snapshot.candidateId,
		name: snapshot.name,
		gender: snapshot.gender,
		age: snapshot.age,
		location: snapshot.location,
		occupation: snapshot.occupation,
		bio: snapshot.bio,
		isTokuzou: true,
		photos: [
			{
				id: snapshot.assetId,
				url: snapshot.imageUrl,
				isPrimary: true,
			},
		],
		primaryPhotoUrl: snapshot.imageUrl,
	};
}

function parseCandidateId(candidateId: string) {
	const [assetId, variantPart] = candidateId.split(":");
	const variantNumber = Number(variantPart);

	if (
		!assetId ||
		!variantPart ||
		!Number.isInteger(variantNumber) ||
		variantNumber < 1
	) {
		throw new HTTPException(400, { message: "候補データが不正です。" });
	}

	return {
		assetId,
		variantIndex: variantNumber - 1,
	};
}

function getTokuzouTargetGender(gender: Gender): Gender {
	return gender === "male" ? "female" : "male";
}

function toGender(value: string): Gender {
	const parsed = genderSchema.safeParse(value);
	if (!parsed.success) {
		throw new HTTPException(500, {
			message: "保存されている性別データが不正です。",
		});
	}

	return parsed.data;
}

function createWelcomeMessage(name: string, gender: Gender) {
	return gender === "male"
		? `${name}です。マッチありがとう。落ち着いたカフェと夜の散歩、どっちのデートが気分ですか？`
		: `${name}です。マッチうれしいです。最初に会うなら、ごはん派かお散歩派か知りたいです。`;
}

function createTokuzouReply(body: string, gender: Gender, name: string) {
	const text = body.toLowerCase();

	if (
		text.includes("coffee") ||
		text.includes("cafe") ||
		text.includes("コーヒー") ||
		text.includes("カフェ")
	) {
		return `${name}もカフェ好きです。静かな席で、つい長話になるタイプです。`;
	}

	if (
		text.includes("movie") ||
		text.includes("film") ||
		text.includes("映画")
	) {
		return "映画のあとに感想を話しながら歩く時間、かなり好きです。余韻まで楽しみたい派です。";
	}

	if (
		text.includes("food") ||
		text.includes("dinner") ||
		text.includes("sushi") ||
		text.includes("ごはん") ||
		text.includes("ご飯") ||
		text.includes("寿司")
	) {
		return "ごはんの相性って大事ですよね。肩ひじ張らずに笑えるお店が理想です。";
	}

	if (
		text.includes("travel") ||
		text.includes("trip") ||
		text.includes("旅行")
	) {
		return "旅行の話って、その人の空気感が出て好きです。次の休みに行くならどこがいいですか？";
	}

	if (
		text.includes("music") ||
		text.includes("song") ||
		text.includes("live") ||
		text.includes("音楽") ||
		text.includes("ライブ")
	) {
		return "音楽の好みは気になります。1曲だけおすすめをもらえたら、その日の気分まで想像しちゃいそうです。";
	}

	const replies =
		gender === "male"
			? [
					"その話、もっと聞いてみたいです。自然に会話が続く感じ、いいですね。",
					"いいですね。そういう感覚が合う人とは、会ったときもきっと楽しい気がします。",
					"そのテンポ、落ち着きます。仲よくなったら意外な一面も知れそうです。",
				]
			: [
					"その感じ、ちょっと惹かれます。もう少し深く知りたくなりました。",
					"やさしい空気が伝わってきます。会ったときも自然体で話せそうです。",
					"その話し方、好きです。肩の力を抜いて話せる相手って貴重ですよね。",
				];

	return replies[body.length % replies.length];
}

function createSeed(value: string) {
	let hash = 0;

	for (const char of value) {
		hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_007;
	}

	return Math.abs(hash);
}

function shouldCreateGeneratedMatch(userId: string, candidateId: string) {
	return (
		createSeed(`${userId}:${candidateId}`) % 100 < GENERATED_MATCH_RATE_PERCENT
	);
}

function pickFromPool<T>(values: T[], seed: number) {
	return values[seed % values.length];
}

function createPortraitDataUri(params: {
	label: string;
	subtitle: string;
	start: string;
	end: string;
}) {
	const { label, subtitle, start, end } = params;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" role="img" aria-label="${escapeHtml(label)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="800" height="1100" rx="48" fill="url(#g)"/><circle cx="400" cy="360" r="190" fill="rgba(255,255,255,0.18)"/><circle cx="400" cy="330" r="120" fill="rgba(255,255,255,0.35)"/><path d="M220 860c36-172 122-258 180-258s144 86 180 258" fill="rgba(255,255,255,0.35)"/><rect x="76" y="862" width="648" height="138" rx="32" fill="rgba(11,17,26,0.22)"/><text x="400" y="928" fill="#fff" font-family="Georgia, serif" font-size="62" text-anchor="middle">${escapeHtml(label)}</text><text x="400" y="974" fill="rgba(255,255,255,0.82)" font-family="Verdana, sans-serif" font-size="28" text-anchor="middle">${escapeHtml(subtitle)}</text></svg>`;

	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(text: string) {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

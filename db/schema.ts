import { relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const files = pgTable("files", {
	id: text("id").primaryKey().notNull(),
	bucket: varchar("bucket", { length: 255 }).notNull(),
	key: varchar("key", { length: 1024 }).notNull(),
	contentType: varchar("content_type", { length: 255 }).notNull(),
	size: bigint("size", { mode: "number" }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const pushSubscription = pgTable(
	"push_subscription",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		expirationTime: bigint("expiration_time", { mode: "number" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("push_subscription_userId_idx").on(table.userId),
		uniqueIndex("push_subscription_userId_endpoint_idx").on(
			table.userId,
			table.endpoint,
		),
	],
);

export const profile = pgTable("profile", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	gender: varchar("gender", { length: 16 }).notNull(),
	discoveryCursor: integer("discovery_cursor").default(0).notNull(),
	age: integer("age").notNull(),
	location: text("location").notNull(),
	occupation: text("occupation").notNull(),
	bio: text("bio").notNull(),
	onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
	isTokuzou: boolean("is_tokuzou").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const profilePhoto = pgTable(
	"profile_photo",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		fileId: text("file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		imageUrl: text("image_url").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		isPrimary: boolean("is_primary").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("profile_photo_userId_idx").on(table.userId),
		index("profile_photo_userId_sortOrder_idx").on(
			table.userId,
			table.sortOrder,
		),
	],
);

export const tokuzouAsset = pgTable(
	"tokuzou_asset",
	{
		id: text("id").primaryKey(),
		gender: varchar("gender", { length: 16 }).notNull(),
		fileId: text("file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		imageUrl: text("image_url").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("tokuzou_asset_gender_idx").on(table.gender),
		index("tokuzou_asset_gender_sort_idx").on(table.gender, table.sortOrder),
	],
);

export const tokuzouGeneratedAction = pgTable(
	"tokuzou_generated_action",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		candidateId: text("candidate_id").notNull(),
		assetId: text("asset_id")
			.notNull()
			.references(() => tokuzouAsset.id, { onDelete: "cascade" }),
		action: varchar("action", { length: 16 }).notNull(),
		candidateGender: varchar("candidate_gender", { length: 16 }).notNull(),
		candidateName: text("candidate_name").notNull(),
		candidateAge: integer("candidate_age").notNull(),
		candidateLocation: text("candidate_location").notNull(),
		candidateOccupation: text("candidate_occupation").notNull(),
		candidateBio: text("candidate_bio").notNull(),
		candidateImageUrl: text("candidate_image_url").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("tokuzou_generated_action_userId_idx").on(table.userId)],
);

export const tokuzouGeneratedMatch = pgTable(
	"tokuzou_generated_match",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		candidateId: text("candidate_id").notNull(),
		assetId: text("asset_id")
			.notNull()
			.references(() => tokuzouAsset.id, { onDelete: "cascade" }),
		candidateGender: varchar("candidate_gender", { length: 16 }).notNull(),
		candidateName: text("candidate_name").notNull(),
		candidateAge: integer("candidate_age").notNull(),
		candidateLocation: text("candidate_location").notNull(),
		candidateOccupation: text("candidate_occupation").notNull(),
		candidateBio: text("candidate_bio").notNull(),
		candidateImageUrl: text("candidate_image_url").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("tokuzou_generated_match_userId_idx").on(table.userId),
		uniqueIndex("tokuzou_generated_match_user_candidate_idx").on(
			table.userId,
			table.candidateId,
		),
	],
);

export const tokuzouGeneratedMessage = pgTable(
	"tokuzou_generated_message",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => tokuzouGeneratedMatch.id, { onDelete: "cascade" }),
		sender: varchar("sender", { length: 16 }).notNull(),
		senderName: text("sender_name").notNull(),
		body: text("body").notNull(),
		isRead: boolean("is_read").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("tokuzou_generated_message_matchId_idx").on(table.matchId)],
);

export const matchAction = pgTable(
	"match_action",
	{
		id: text("id").primaryKey(),
		actorUserId: text("actor_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		targetUserId: text("target_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		action: varchar("action", { length: 16 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("match_action_actorUserId_idx").on(table.actorUserId),
		uniqueIndex("match_action_actor_target_idx").on(
			table.actorUserId,
			table.targetUserId,
		),
	],
);

export const tokuzouMatch = pgTable(
	"tokuzou_match",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		tokuzouUserId: text("tokuzou_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("tokuzou_match_userId_idx").on(table.userId),
		uniqueIndex("tokuzou_match_user_tokuzou_idx").on(
			table.userId,
			table.tokuzouUserId,
		),
	],
);

export const chatMessage = pgTable(
	"chat_message",
	{
		id: text("id").primaryKey(),
		matchId: text("match_id")
			.notNull()
			.references(() => tokuzouMatch.id, { onDelete: "cascade" }),
		senderUserId: text("sender_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		isRead: boolean("is_read").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("chat_message_matchId_idx").on(table.matchId),
		index("chat_message_senderUserId_idx").on(table.senderUserId),
	],
);

export const userRelations = relations(user, ({ many, one }) => ({
	sessions: many(session),
	accounts: many(account),
	pushSubscriptions: many(pushSubscription),
	profile: one(profile),
	profilePhotos: many(profilePhoto),
	tokuzouGeneratedActions: many(tokuzouGeneratedAction),
	tokuzouGeneratedMatches: many(tokuzouGeneratedMatch),
	matchActions: many(matchAction, { relationName: "match_action_actor" }),
	matchTargets: many(matchAction, { relationName: "match_action_target" }),
	matches: many(tokuzouMatch, { relationName: "tokuzou_match_user" }),
	tokuzouMatches: many(tokuzouMatch, { relationName: "tokuzou_match_tokuzou" }),
	messages: many(chatMessage),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const profileRelations = relations(profile, ({ one, many }) => ({
	user: one(user, {
		fields: [profile.userId],
		references: [user.id],
	}),
	photos: many(profilePhoto),
}));

export const profilePhotoRelations = relations(profilePhoto, ({ one }) => ({
	user: one(user, {
		fields: [profilePhoto.userId],
		references: [user.id],
	}),
	file: one(files, {
		fields: [profilePhoto.fileId],
		references: [files.id],
	}),
}));

export const tokuzouAssetRelations = relations(
	tokuzouAsset,
	({ one, many }) => ({
		file: one(files, {
			fields: [tokuzouAsset.fileId],
			references: [files.id],
		}),
		actions: many(tokuzouGeneratedAction),
		matches: many(tokuzouGeneratedMatch),
	}),
);

export const tokuzouGeneratedActionRelations = relations(
	tokuzouGeneratedAction,
	({ one }) => ({
		user: one(user, {
			fields: [tokuzouGeneratedAction.userId],
			references: [user.id],
		}),
		asset: one(tokuzouAsset, {
			fields: [tokuzouGeneratedAction.assetId],
			references: [tokuzouAsset.id],
		}),
	}),
);

export const tokuzouGeneratedMatchRelations = relations(
	tokuzouGeneratedMatch,
	({ one, many }) => ({
		user: one(user, {
			fields: [tokuzouGeneratedMatch.userId],
			references: [user.id],
		}),
		asset: one(tokuzouAsset, {
			fields: [tokuzouGeneratedMatch.assetId],
			references: [tokuzouAsset.id],
		}),
		messages: many(tokuzouGeneratedMessage),
	}),
);

export const tokuzouGeneratedMessageRelations = relations(
	tokuzouGeneratedMessage,
	({ one }) => ({
		match: one(tokuzouGeneratedMatch, {
			fields: [tokuzouGeneratedMessage.matchId],
			references: [tokuzouGeneratedMatch.id],
		}),
	}),
);

export const matchActionRelations = relations(matchAction, ({ one }) => ({
	actor: one(user, {
		fields: [matchAction.actorUserId],
		references: [user.id],
		relationName: "match_action_actor",
	}),
	target: one(user, {
		fields: [matchAction.targetUserId],
		references: [user.id],
		relationName: "match_action_target",
	}),
}));

export const tokuzouMatchRelations = relations(
	tokuzouMatch,
	({ one, many }) => ({
		user: one(user, {
			fields: [tokuzouMatch.userId],
			references: [user.id],
			relationName: "tokuzou_match_user",
		}),
		tokuzouUser: one(user, {
			fields: [tokuzouMatch.tokuzouUserId],
			references: [user.id],
			relationName: "tokuzou_match_tokuzou",
		}),
		messages: many(chatMessage),
	}),
);

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
	match: one(tokuzouMatch, {
		fields: [chatMessage.matchId],
		references: [tokuzouMatch.id],
	}),
	sender: one(user, {
		fields: [chatMessage.senderUserId],
		references: [user.id],
	}),
}));

export const pushSubscriptionRelations = relations(
	pushSubscription,
	({ one }) => ({
		user: one(user, {
			fields: [pushSubscription.userId],
			references: [user.id],
		}),
	}),
);

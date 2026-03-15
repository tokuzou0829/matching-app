import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createHonoApp } from "@/server/create-app";
import {
	genderSchema,
	getMyProfile,
	initializeMyProfileGender,
	resetMyProfilePhoto,
	updateMyProfilePhoto,
	upsertMyProfile,
} from "@/server/matching";
import { getUserOrThrow } from "@/server/middleware/auth";

const profileSchema = z.object({
	gender: genderSchema,
	age: z.number().int().min(18).max(99),
	location: z.string().trim().min(1).max(64),
	occupation: z.string().trim().min(1).max(64),
	bio: z.string().trim().min(1).max(320),
});

const initializeProfileSchema = z.object({
	gender: genderSchema,
});

const photoSchema = z.object({
	dataUrl: z.string().min(1),
});

const app = createHonoApp()
	.get("/me", async (c) => {
		const { user } = await getUserOrThrow(c);
		const profile = await getMyProfile(c.get("db"), user.id);

		return c.json({
			profile,
		});
	})
	.post(
		"/initialize",
		zValidator("json", initializeProfileSchema),
		async (c) => {
			const { user } = await getUserOrThrow(c);
			const payload = c.req.valid("json");
			const profile = await initializeMyProfileGender(
				c.get("db"),
				user.id,
				payload.gender,
			);

			return c.json({
				profile,
			});
		},
	)
	.put("/me", zValidator("json", profileSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const payload = c.req.valid("json");
		const profile = await upsertMyProfile(c.get("db"), user.id, payload);

		return c.json({
			profile,
		});
	})
	.post("/me/photo", zValidator("json", photoSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const payload = c.req.valid("json");
		const profile = await updateMyProfilePhoto(
			c.get("db"),
			user.id,
			payload.dataUrl,
		);

		return c.json({
			profile,
		});
	})
	.delete("/me/photo", async (c) => {
		const { user } = await getUserOrThrow(c);
		const profile = await resetMyProfilePhoto(c.get("db"), user.id);

		return c.json({
			profile,
		});
	});

export default app;

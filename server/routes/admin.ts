import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	endAdminSession,
	isAdminAuthenticated,
	requireAdmin,
	startAdminSession,
} from "@/server/admin-auth";
import { createHonoApp } from "@/server/create-app";
import {
	addTokuzouAssets,
	deleteTokuzouAsset,
	genderSchema,
	listTokuzouAssets,
	validateStoredImageDataUrl,
} from "@/server/matching";

const loginSchema = z.object({
	password: z.string().min(1),
});

const uploadAssetsSchema = z.object({
	gender: genderSchema,
	photos: z.array(z.string().min(1)).min(1),
});

const app = createHonoApp()
	.get("/session", (c) => {
		return c.json({
			authenticated: isAdminAuthenticated(c),
		});
	})
	.post("/login", zValidator("json", loginSchema), (c) => {
		const adminPass = process.env.ADMIN_PASS;
		if (!adminPass) {
			return c.json({ error: "ADMIN_PASS が設定されていません。" }, 500);
		}

		const payload = c.req.valid("json");
		if (payload.password !== adminPass) {
			return c.json({ error: "パスワードが違います。" }, 401);
		}

		startAdminSession(c);
		return c.json({ ok: true });
	})
	.post("/logout", (c) => {
		endAdminSession(c);
		return c.json({ ok: true });
	})
	.get("/assets", async (c) => {
		requireAdmin(c);
		const rawGender = c.req.query("gender");
		const parsedGender = rawGender ? genderSchema.safeParse(rawGender) : null;

		if (rawGender && !parsedGender?.success) {
			return c.json({ error: "性別パラメータが不正です。" }, 400);
		}

		return c.json({
			assets: await listTokuzouAssets(c.get("db"), parsedGender?.data),
		});
	})
	.post("/assets", zValidator("json", uploadAssetsSchema), async (c) => {
		requireAdmin(c);
		const payload = c.req.valid("json");

		for (const photo of payload.photos) {
			validateStoredImageDataUrl(photo, 500_000);
		}

		const assets = await addTokuzouAssets(
			c.get("db"),
			payload.gender,
			payload.photos,
		);

		return c.json({ assets });
	})
	.delete("/assets/:assetId", async (c) => {
		requireAdmin(c);
		const result = await deleteTokuzouAsset(
			c.get("db"),
			c.req.param("assetId"),
		);

		return c.json(result);
	});
export default app;

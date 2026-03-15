import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createHonoApp } from "@/server/create-app";
import { getChatForUser, sendMessageAsUser } from "@/server/matching";
import { getUserOrThrow } from "@/server/middleware/auth";

const messageSchema = z.object({
	body: z.string().trim().min(1).max(500),
});

const app = createHonoApp()
	.get("/:matchId/messages", async (c) => {
		const { user } = await getUserOrThrow(c);
		const chat = await getChatForUser(
			c.get("db"),
			user.id,
			c.req.param("matchId"),
		);

		return c.json(chat);
	})
	.post("/:matchId/messages", zValidator("json", messageSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const payload = c.req.valid("json");
		const chat = await sendMessageAsUser(
			c.get("db"),
			user.id,
			c.req.param("matchId"),
			payload.body,
		);

		return c.json(chat);
	});

export default app;

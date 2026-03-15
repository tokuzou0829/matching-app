import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { createHonoApp } from "@/server/create-app";
import {
	applyMatchDecision,
	getDiscoveryState,
	listMatchesForUser,
	matchActionSchema,
	resetTokuzouJourney,
} from "@/server/matching";
import { getUserOrThrow } from "@/server/middleware/auth";

const actionSchema = z.object({
	candidateId: z.string().min(1),
	action: matchActionSchema,
});

const app = createHonoApp()
	.get("/discovery", async (c) => {
		const { user } = await getUserOrThrow(c);
		const state = await getDiscoveryState(c.get("db"), user.id);

		return c.json(state);
	})
	.get("/matches", async (c) => {
		const { user } = await getUserOrThrow(c);
		const matches = await listMatchesForUser(c.get("db"), user.id);

		return c.json({
			matches,
		});
	})
	.post("/actions", zValidator("json", actionSchema), async (c) => {
		const { user } = await getUserOrThrow(c);
		const payload = c.req.valid("json");
		const result = await applyMatchDecision(
			c.get("db"),
			user.id,
			payload.candidateId,
			payload.action,
		);

		return c.json(result);
	})
	.post("/reset", async (c) => {
		const { user } = await getUserOrThrow(c);
		const result = await resetTokuzouJourney(c.get("db"), user.id);

		return c.json(result);
	});

export default app;

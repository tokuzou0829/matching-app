import { createHonoApp } from "@/server/create-app";
import adminRoute from "@/server/routes/admin";
import authRoute from "@/server/routes/auth";
import chatsRoute from "@/server/routes/chats";
import matchingRoute from "@/server/routes/matching";
import notificationsRoute from "@/server/routes/notifications";
import profilesRoute from "@/server/routes/profiles";

const app = createHonoApp()
	.basePath("/api")
	.route("/admin", adminRoute)
	.route("/auth", authRoute)
	.route("/profiles", profilesRoute)
	.route("/matching", matchingRoute)
	.route("/chats", chatsRoute)
	.route("/notifications", notificationsRoute);

export { app };

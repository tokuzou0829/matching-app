import { handle } from "hono/vercel";

import { app } from "@/server/hono-app";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

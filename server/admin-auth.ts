import { createHash, timingSafeEqual } from "node:crypto";

import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import type { Context } from "@/server/types";

const ADMIN_COOKIE_NAME = "tokuzou-admin";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12;

export function isAdminAuthenticated(c: Context) {
	const adminPass = process.env.ADMIN_PASS;
	const authSecret = process.env.BETTER_AUTH_SECRET;
	const cookie = getCookie(c, ADMIN_COOKIE_NAME);

	if (!adminPass || !authSecret || !cookie) {
		return false;
	}

	const expected = createAdminToken(adminPass, authSecret);
	const actualBuffer = Buffer.from(cookie);
	const expectedBuffer = Buffer.from(expected);

	if (actualBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireAdmin(c: Context) {
	if (!isAdminAuthenticated(c)) {
		throw new HTTPException(401, { message: "管理者ログインが必要です。" });
	}
}

export function startAdminSession(c: Context) {
	const adminPass = process.env.ADMIN_PASS;
	const authSecret = process.env.BETTER_AUTH_SECRET;

	if (!adminPass || !authSecret) {
		throw new HTTPException(500, {
			message: "ADMIN_PASS が設定されていません。",
		});
	}

	setCookie(c, ADMIN_COOKIE_NAME, createAdminToken(adminPass, authSecret), {
		httpOnly: true,
		sameSite: "Lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: ADMIN_COOKIE_MAX_AGE,
	});
}

export function endAdminSession(c: Context) {
	deleteCookie(c, ADMIN_COOKIE_NAME, {
		path: "/",
	});
}

function createAdminToken(adminPass: string, authSecret: string) {
	return createHash("sha256")
		.update(`${adminPass}:${authSecret}:tokuzou-admin`)
		.digest("hex");
}

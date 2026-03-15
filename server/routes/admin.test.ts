import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { setup } from "@/tests/vitest.helper";

const { db } = await setup();

import app from "./admin";

describe("/routes/admin", () => {
	it("rejects asset access without admin login", async () => {
		const response = await app.request("/assets?gender=female", {
			method: "GET",
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({
			error: "管理者ログインが必要です。",
		});
	});

	it("logs in with ADMIN_PASS and stores tokuzou images in the database", async () => {
		const loginResponse = await app.request("/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				password: "test-admin-pass",
			}),
		});

		expect(loginResponse.status).toBe(200);
		const cookie =
			loginResponse.headers.get("set-cookie")?.split(";")[0] ?? null;
		expect(cookie).toContain("tokuzou-admin=");

		const uploadResponse = await app.request("/assets", {
			method: "POST",
			headers: {
				...(cookie ? { Cookie: cookie } : {}),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "female",
				photos: [
					"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QEA8QEA8PEA8PDw8QEA8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0fHx8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBEQACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oADAMBAAIQAxAAAAHhAH//xAAZEAEAAwEBAAAAAAAAAAAAAAABAAIRITH/2gAIAQEAAQUCkR8jM//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8BP//Z",
				],
			}),
		});
		const uploadJson = await uploadResponse.json();

		expect(uploadResponse.status).toBe(200);
		expect(uploadJson.assets).toHaveLength(1);
		expect(uploadJson.assets[0]).toMatchObject({
			gender: "female",
			imageUrl: expect.stringContaining("data:image/jpeg;base64,"),
		});

		const assetRows = await db.select().from(schema.tokuzouAsset);
		expect(assetRows).toHaveLength(1);
		expect(assetRows[0].fileId).toBeNull();
		expect(assetRows[0].imageUrl).toContain("data:image/jpeg;base64,");
	});
});

import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { setup } from "@/tests/vitest.helper";

import chatsApp from "./chats";
import matchingApp from "./matching";
import profilesApp from "./profiles";

const { createUser, db } = await setup();

describe("matching flow", () => {
	it("locks gender after initialization", async () => {
		await createUser();

		const initResponse = await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "male",
			}),
		});

		expect(initResponse.status).toBe(200);

		const updateResponse = await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "female",
				age: 28,
				location: "東京",
				occupation: "会社員",
				bio: "散歩とカフェが好きです。",
			}),
		});
		const updateJson = await updateResponse.json();

		expect(updateResponse.status).toBe(400);
		expect(updateJson).toMatchObject({
			error: "登録後に性別は変更できません。",
		});
	});

	it("stores a single resized-style user photo in the database", async () => {
		await createUser();

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "male" }),
		});

		const response = await profilesApp.request("/me/photo", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				dataUrl:
					"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QEA8QEA8PEA8PDw8QEA8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0fHx8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBEQACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oADAMBAAIQAxAAAAHhAH//xAAZEAEAAwEBAAAAAAAAAAAAAAABAAIRITH/2gAIAQEAAQUCkR8jM//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8BP//Z",
			}),
		});
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.profile.photos).toHaveLength(1);
		expect(json.profile.photos[0].url).toContain("data:image/jpeg;base64,");

		const photoRows = await db.select().from(schema.profilePhoto);
		expect(photoRows).toHaveLength(1);
		expect(photoRows[0].imageUrl).toContain("data:image/jpeg;base64,");

		const userRows = await db.select().from(schema.user);
		expect(userRows[0].image).toBe(photoRows[0].imageUrl);
	});

	it("can reset the user photo back to the default placeholder", async () => {
		await createUser();

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "female" }),
		});

		await profilesApp.request("/me/photo", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				dataUrl:
					"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnPZXcAAAAASUVORK5CYII=",
			}),
		});

		const response = await profilesApp.request("/me/photo", {
			method: "DELETE",
		});
		const json = await response.json();

		expect(response.status).toBe(200);
		expect(json.profile.photos).toHaveLength(1);
		expect(json.profile.photos[0].url).toContain("data:image/svg+xml");

		const photoRows = await db.select().from(schema.profilePhoto);
		expect(photoRows).toHaveLength(1);
		expect(photoRows[0].imageUrl).toContain("data:image/svg+xml");
	});

	it("shows only the opposite generated Tokuzou after onboarding", async () => {
		await createUser();
		await seedAsset("female", "https://example.com/tokuzou-female-1.png");
		await seedAsset("male", "https://example.com/tokuzou-male-1.png");

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "male" }),
		});

		await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "male",
				age: 28,
				location: "東京",
				occupation: "エンジニア",
				bio: "コーヒーと本が好きです。",
			}),
		});

		const discoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const discoveryJson = await discoveryResponse.json();

		expect(discoveryResponse.status).toBe(200);
		expect(discoveryJson).toMatchObject({
			requiresOnboarding: false,
			candidate: {
				gender: "female",
				isTokuzou: true,
				candidateId: expect.any(String),
				primaryPhotoUrl: "https://example.com/tokuzou-female-1.png",
			},
		});
	});

	it("supports infinite matches and generated chat replies", async () => {
		await createUser();
		await seedAsset("male", "https://example.com/tokuzou-male-1.png", 0, "a");
		await seedAsset("male", "https://example.com/tokuzou-male-2.png", 1, "d");

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "female" }),
		});

		await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "female",
				age: 27,
				location: "大阪",
				occupation: "プロデューサー",
				bio: "ライブと小旅行が好きです。",
			}),
		});

		const firstDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const firstDiscoveryJson = await firstDiscoveryResponse.json();

		const firstActionResponse = await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: firstDiscoveryJson.candidate.candidateId,
				action: "like",
			}),
		});
		const firstActionJson = await firstActionResponse.json();

		expect(firstActionResponse.status).toBe(200);
		expect(firstActionJson).toMatchObject({
			matched: true,
			match: {
				tokuzou: {
					gender: "male",
					isTokuzou: true,
				},
			},
		});

		const secondDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const secondDiscoveryJson = await secondDiscoveryResponse.json();

		expect(secondDiscoveryJson.candidate.candidateId).not.toBe(
			firstDiscoveryJson.candidate.candidateId,
		);

		const secondActionResponse = await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: secondDiscoveryJson.candidate.candidateId,
				action: "like",
			}),
		});
		const secondActionJson = await secondActionResponse.json();

		expect(secondActionResponse.status).toBe(200);
		expect(secondActionJson.matched).toBe(true);
		expect(secondActionJson.match.id).not.toBe(firstActionJson.match.id);

		const matchesResponse = await matchingApp.request("/matches", {
			method: "GET",
		});
		const matchesJson = await matchesResponse.json();

		expect(matchesResponse.status).toBe(200);
		expect(matchesJson.matches).toHaveLength(2);

		const messagesResponse = await chatsApp.request(
			`/${firstActionJson.match.id}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					body: "海の近くでカフェデートしたいです。",
				}),
			},
		);
		const messagesJson = await messagesResponse.json();

		expect(messagesResponse.status).toBe(200);
		expect(messagesJson.messages).toHaveLength(3);
		expect(messagesJson.messages[2]).toMatchObject({
			isMe: false,
			body: expect.stringContaining("カフェ"),
		});
	});

	it("returns no match for deterministic non-winning likes", async () => {
		await createUser();
		await seedAsset("male", "https://example.com/tokuzou-male-1.png", 0, "b");

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "female" }),
		});

		await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "female",
				age: 27,
				location: "大阪",
				occupation: "プロデューサー",
				bio: "ライブと小旅行が好きです。",
			}),
		});

		const discoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const discoveryJson = await discoveryResponse.json();

		const actionResponse = await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: discoveryJson.candidate.candidateId,
				action: "like",
			}),
		});
		const actionJson = await actionResponse.json();

		expect(actionResponse.status).toBe(200);
		expect(actionJson).toEqual({
			matched: false,
			match: null,
		});

		const matchRows = await db.select().from(schema.tokuzouGeneratedMatch);
		expect(matchRows).toHaveLength(0);

		const messageRows = await db.select().from(schema.tokuzouGeneratedMessage);
		expect(messageRows).toHaveLength(0);

		const actionRows = await db.select().from(schema.tokuzouGeneratedAction);
		expect(actionRows).toHaveLength(1);
		expect(actionRows[0].action).toBe("like");
	});

	it("rotates discovery images across multiple uploaded assets", async () => {
		await createUser();
		await seedAsset("female", "https://example.com/tokuzou-female-1.png", 0);
		await seedAsset("female", "https://example.com/tokuzou-female-2.png", 1);

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "male" }),
		});

		await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "male",
				age: 28,
				location: "東京",
				occupation: "エンジニア",
				bio: "コーヒーと本が好きです。",
			}),
		});

		const firstDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const firstDiscoveryJson = await firstDiscoveryResponse.json();

		expect(firstDiscoveryResponse.status).toBe(200);
		expect(firstDiscoveryJson.candidate.primaryPhotoUrl).toBe(
			"https://example.com/tokuzou-female-1.png",
		);

		await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: firstDiscoveryJson.candidate.candidateId,
				action: "pass",
			}),
		});

		const secondDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const secondDiscoveryJson = await secondDiscoveryResponse.json();

		expect(secondDiscoveryResponse.status).toBe(200);
		expect(secondDiscoveryJson.candidate.primaryPhotoUrl).toBe(
			"https://example.com/tokuzou-female-2.png",
		);
		expect(secondDiscoveryJson.candidate.candidateId).not.toBe(
			firstDiscoveryJson.candidate.candidateId,
		);
	});

	it("advances discovery even when the same candidate id is submitted twice", async () => {
		await createUser();
		await seedAsset("female", "https://example.com/tokuzou-female-1.png", 0);
		await seedAsset("female", "https://example.com/tokuzou-female-2.png", 1);

		await profilesApp.request("/initialize", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ gender: "male" }),
		});

		await profilesApp.request("/me", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				gender: "male",
				age: 28,
				location: "東京",
				occupation: "エンジニア",
				bio: "コーヒーと本が好きです。",
			}),
		});

		const firstDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const firstDiscoveryJson = await firstDiscoveryResponse.json();

		await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: firstDiscoveryJson.candidate.candidateId,
				action: "pass",
			}),
		});

		const secondDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const secondDiscoveryJson = await secondDiscoveryResponse.json();

		expect(secondDiscoveryJson.candidate.primaryPhotoUrl).toBe(
			"https://example.com/tokuzou-female-2.png",
		);

		await matchingApp.request("/actions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				candidateId: firstDiscoveryJson.candidate.candidateId,
				action: "pass",
			}),
		});

		const thirdDiscoveryResponse = await matchingApp.request("/discovery", {
			method: "GET",
		});
		const thirdDiscoveryJson = await thirdDiscoveryResponse.json();

		expect(thirdDiscoveryResponse.status).toBe(200);
		expect(thirdDiscoveryJson.candidate.primaryPhotoUrl).toBe(
			"https://example.com/tokuzou-female-1.png",
		);
		expect(thirdDiscoveryJson.candidate.candidateId.endsWith(":2")).toBe(true);

		const actionRows = await db.select().from(schema.tokuzouGeneratedAction);
		expect(actionRows).toHaveLength(2);
	});
});

async function seedAsset(
	gender: Gender,
	imageUrl: string,
	sortOrder = 0,
	id = crypto.randomUUID(),
) {
	await db.insert(schema.tokuzouAsset).values({
		id,
		gender,
		imageUrl,
		sortOrder,
	});
}

type Gender = "male" | "female";

import { HTTPException } from "hono/http-exception";

export class ValidationError extends HTTPException {
	constructor(message: string, cause?: unknown) {
		super(400, { message, cause });
		this.name = "ValidationError";
	}
}

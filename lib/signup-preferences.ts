const SIGNUP_GENDER_STORAGE_KEY = "tokuzou-signup-gender";

export function savePreferredGender(gender: "male" | "female") {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(SIGNUP_GENDER_STORAGE_KEY, gender);
}

export function loadPreferredGender() {
	if (typeof window === "undefined") {
		return null;
	}

	const value = window.localStorage.getItem(SIGNUP_GENDER_STORAGE_KEY);
	return value === "male" || value === "female" ? value : null;
}

export function clearPreferredGender() {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.removeItem(SIGNUP_GENDER_STORAGE_KEY);
}

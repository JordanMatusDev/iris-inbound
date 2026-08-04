import type { UserRecord } from "@server/db/schema-app";

export interface AuthPayload {
	username?: string;
	password?: string;
}

export interface AuthRecord {
	token: string;
	user: UserRecord;
}

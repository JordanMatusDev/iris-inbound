import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/server/db/schema-app.ts",
	out: "./drizzle",
	dialect: "mysql",
	dbCredentials: {
		host: "127.0.0.1",
		port: 3306,
		user: process.env["PBX_DB_USER"] || "",
		password: process.env["PBX_DB_PASSWORD"] || "",
		database: process.env["DB_NAME_APP"] || "",
	},
});

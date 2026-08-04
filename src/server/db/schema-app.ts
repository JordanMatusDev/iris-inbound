import {
	mysqlTable,
	int,
	varchar,
	boolean,
	timestamp,
	datetime,
	json,
	bigint,
} from "drizzle-orm/mysql-core";

// ==========================================
// TIPOS LITERALES Y UNIONES
// ==========================================
export type UserRole = "admin" | "agent";
export type InteractionStatus = "pending" | "processed";
export type InteractionType = "inbound" | "outbound";

// ==========================================
// TABLAS
// ==========================================
export const users = mysqlTable("users", {
	id: int("id").autoincrement().primaryKey(),
	username: varchar("username", { length: 10 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	extension: varchar("extension", { length: 10 }).notNull(),
	role: varchar("role", { length: 50 }).$type<UserRole>().notNull(),
	connectionStatus: boolean("connection_status").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: datetime("updated_at"),
});

export const localCampaigns = mysqlTable("local_campaigns", {
	id: int("id").autoincrement().primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	sonataFormId: bigint("sonata_form_id", {
		mode: "number",
		unsigned: true,
	}).notNull(),
	ombutelQueueId: int("ombutel_queue_id", { unsigned: true }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interactions = mysqlTable("interactions", {
	id: int("id").autoincrement().primaryKey(),
	asteriskUniqueId: varchar("asterisk_uniqueid", { length: 32 })
		.notNull()
		.unique(),
	type: varchar("type", { length: 20 })
		.$type<InteractionType>()
		.default("inbound")
		.notNull(),
	status: varchar("status", { length: 20 })
		.$type<InteractionStatus>()
		.default("pending")
		.notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: datetime("updated_at"),
});

export const irisCampaignsResult = mysqlTable("iris_campaigns_results", {
	id: int("id").autoincrement().primaryKey(),
	agentId: int("agent_id").notNull(),
	campaignId: int("campaign_id").notNull(),
	asteriskUniqueId: varchar("asterisk_uniqueid", { length: 32 }).notNull(),
	customerPhone: varchar("customer_phone", { length: 20 }),
	formId: bigint("form_id", { mode: "number", unsigned: true }).notNull(),
	dispositionId: int("disposition_id", { unsigned: true }).notNull(),
	formData: json("form_data").notNull(),
	s3Url: varchar("s3_url", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: datetime("updated_at"),
});

export const irisCustomers = mysqlTable("iris_customers", {
	id: int("id").autoincrement().primaryKey(),
	fullName: varchar("full_name", { length: 50 }).notNull(),
	phone: varchar("phone", { length: 12 }).notNull(),
});

// ==========================================
// TIPOS INFERIDOS
// ==========================================

// Selects
export type User = typeof users.$inferSelect;
export type UserRecord = Omit<User, "passwordHash">;
export type LocalCampaign = typeof localCampaigns.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type IrisCampaignsResults = typeof irisCampaignsResult.$inferSelect;
export type IrisCustomer = typeof irisCustomers.$inferSelect;

// Inserts
export type NewUser = typeof users.$inferInsert;
export type NewLocalCampaign = typeof localCampaigns.$inferInsert;
export type NewInteraction = typeof interactions.$inferInsert;
export type NewIrisCampaignResult = typeof irisCampaignsResult.$inferInsert;
export type NewIrisCustomer = typeof irisCustomers.$inferInsert;

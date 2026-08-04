import {
	mysqlTable,
	bigint,
	varchar,
	json,
	date,
	time,
	mysqlEnum,
	timestamp,
	text,
	smallint,
	int,
	tinyint,
	char,
	boolean,
	uniqueIndex,
	index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export type SonataFieldType =
	| "TextField"
	| "TextAreaField"
	| "EmailField"
	| "NumberField"
	| "SelectField"
	| "CheckboxListGroup"
	| "RadioField"
	| "DateField"
	| "TimeField"
	| "ImgField";

export type SonataConditionalAction = "show" | "hide";

export type SonataConditionalComparison =
	| "is"
	| "is not"
	| "empty"
	| "not empty"
	| "contains"
	| "does not contain"
	| "starts with"
	| "ends with"
	| "greater than"
	| "less than";

export interface SonataFieldRules {
	required: boolean;
	read_only: boolean;
	size: boolean | string;
}

export interface SonataFieldAttributes {
	rows?: number | string;
	maxRows?: number;
	optionsPreference?: "custom_options" | "predefined_options" | string;
	[key: string]: any;
}

export interface SonataFieldConditional {
	enabled: boolean;
	action: SonataConditionalAction;
	field: string | null;
	comparison: SonataConditionalComparison;
	field_value: string | null;
}

export interface SonataFormField {
	name: string;
	placeholder: string | null;
	type: SonataFieldType;
	rules: SonataFieldRules;
	options: string[];
	attr: SonataFieldAttributes;
	conditional: SonataFieldConditional;
}

export type SonataFormSchema = SonataFormField[];

export const formsTable = mysqlTable("forms", {
	id: bigint("id", { mode: "number", unsigned: true })
		.primaryKey()
		.autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	description: varchar("description", { length: 255 }),
	fields: json("fields").$type<SonataFormSchema>().notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
	tenantId: int("tenant_id", { unsigned: true }).notNull(),
});

export const users = mysqlTable(
	"users",
	{
		id: bigint("id", { mode: "number", unsigned: true })
			.primaryKey()
			.autoincrement(),
		name: varchar("name", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }),
		emailVerifiedAt: timestamp("email_verified_at"),
		password: varchar("password", { length: 255 }).notNull(),
		status: mysqlEnum("status", ["active", "busy", "inactive"]),
		extensionId: int("extension_id", { unsigned: true }),
		deviceId: int("device_id", { unsigned: true }),
		tenantId: int("tenant_id", { unsigned: true }),
		systemPermissionId: int("system_permission_id", { unsigned: true }),
		rememberToken: varchar("remember_token", { length: 100 }),
		createdAt: timestamp("created_at"),
		updatedAt: timestamp("updated_at"),
		locale: char("locale", { length: 255 }).notNull().default("en"),
		fullName: varchar("full_name", { length: 255 }),
		deviceName: varchar("device_name", { length: 255 }),
		enableSoftphone: boolean("enable_softphone"),
		extension: int("extension", { unsigned: true }),
		agentProfileId: bigint("agent_profile_id", {
			mode: "number",
			unsigned: true,
		}),
	},
	(table) => [
		uniqueIndex("users_name_unique").on(table.name),
		index("users_system_permission_id_index").on(table.systemPermissionId),
	],
);

export const contacts = mysqlTable(
	"contacts",
	{
		id: bigint("id", { mode: "number", unsigned: true })
			.primaryKey()
			.autoincrement(),
		phone1: char("phone_1", { length: 255 }).notNull(),
		phone2: char("phone_2", { length: 255 }),
		phone3: char("phone_3", { length: 255 }),
		extraFields: json("extra_fields"),
		contactListId: bigint("contact_list_id", {
			mode: "number",
			unsigned: true,
		}).notNull(),
	},
	(table) => [index("contacts_contact_list_id_index").on(table.contactListId)],
);

export const dispositionsTable = mysqlTable("dispositions", {
	id: bigint("id", { mode: "number", unsigned: true })
		.primaryKey()
		.autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	category: mysqlEnum("category", [
		"positive",
		"negative",
		"call_later",
	]).notNull(),
	tenantId: int("tenant_id", { unsigned: true }).notNull(),
	dispositionGroupId: bigint("disposition_group_id", {
		mode: "number",
		unsigned: true,
	}).notNull(),
	reasons: json("reasons"),
});

export const campaignsTable = mysqlTable("campaigns", {
	id: bigint("id", { mode: "number", unsigned: true })
		.primaryKey()
		.autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	startShift: time("start_shift").notNull(),
	endShift: time("end_shift").notNull(),
	status: mysqlEnum("status", ["active", "inactive", "finished"])
		.notNull()
		.default("inactive"),
	contactListId: bigint("contact_list_id", {
		mode: "number",
		unsigned: true,
	}).notNull(),
	formId: bigint("form_id", { mode: "number", unsigned: true }).notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
	script: text("script").notNull(),
	wrapUpTime: smallint("wrap_up_time").notNull(),
	tenantId: int("tenant_id", { unsigned: true }).notNull(),
	queueId: int("queue_id", { unsigned: true }).notNull(),
	queueName: varchar("queue_name", { length: 255 }).notNull(),
	weight: tinyint("weight", { unsigned: true }).notNull(),
	dispositionGroupId: bigint("disposition_group_id", {
		mode: "number",
		unsigned: true,
	}).notNull(),
	callRetries: tinyint("call_retries"),
});

export const campaignResultsTable = mysqlTable("campaign_results", {
	id: bigint("id", { mode: "number", unsigned: true })
		.primaryKey()
		.autoincrement(),
	campaignId: bigint("campaign_id", {
		mode: "number",
		unsigned: true,
	}).notNull(),
	agentId: bigint("agent_id", { mode: "number", unsigned: true }).notNull(),
	dispositionId: int("disposition_id", { unsigned: true }).notNull(),
	fields: json("fields"),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
	contactId: bigint("contact_id", { mode: "number", unsigned: true }).notNull(),
	phone1: char("phone_1", { length: 255 }),
	phone2: char("phone_2", { length: 255 }),
	phone3: char("phone_3", { length: 255 }),
	contactInfo: json("contact_info"),
	callResolutionTime: char("call_resolution_time", { length: 255 }).notNull(),
	reason: varchar("reason", { length: 255 }),
});

export const campaignResultsRelations = relations(
	campaignResultsTable,
	({ one }) => ({
		// Relación con la campaña
		campaign: one(campaignsTable, {
			fields: [campaignResultsTable.campaignId],
			references: [campaignsTable.id],
		}),
		agent: one(users, {
			fields: [campaignResultsTable.agentId],
			references: [users.id],
		}),
		disposition: one(dispositionsTable, {
			fields: [campaignResultsTable.dispositionId],
			references: [dispositionsTable.id],
		}),
		contact: one(contacts, {
			fields: [campaignResultsTable.contactId],
			references: [contacts.id],
		}),
	}),
);

export type CampaignsResultsTable = typeof campaignResultsTable.$inferSelect;
export type EnrichedCampaignsResultsTable = CampaignsResultsTable & {
	campaign: CampaignsTable;
	agent: typeof users.$inferSelect;
	disposition: typeof dispositionsTable.$inferSelect;
	contact: typeof contacts.$inferSelect;
};
export type CampaignsTable = typeof campaignsTable.$inferSelect;
export type FormsTable = typeof formsTable.$inferSelect;
export type DispositionsTable = typeof dispositionsTable.$inferSelect;
export type Contact = typeof contacts.$inferSelect;

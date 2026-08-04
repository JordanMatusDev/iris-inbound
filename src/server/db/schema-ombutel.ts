import { mysqlTable, int, varchar } from "drizzle-orm/mysql-core";

export const ombuQueuesTable = mysqlTable("ombu_queues", {
	queueId: int("queue_id", { unsigned: true }).primaryKey().autoincrement(),
	extension: varchar("extension", { length: 255 }).notNull(),
	description: varchar("description", { length: 255 }),
	direction: varchar("direction", { length: 255 }).notNull().default("inbound"),
});

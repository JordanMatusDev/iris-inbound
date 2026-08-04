import { defineEventHandler, getQuery, createError } from "h3";
import { eq } from "drizzle-orm";
import { dbSonata, ensureServices } from "@server/db";
import {
	dispositionsTable,
	type DispositionsTable,
} from "@server/db/schema-sonata";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";

export default defineEventHandler(
	async (event): Promise<ApiResponse<DispositionsTable[]>> => {
		const user = requireAuth(event);

		await ensureServices();

		try {
			const dispositions = await dbSonata.select().from(dispositionsTable);

			return {
				success: true,
				message: "Tipificaciones obtenidas con exito",
				data: dispositions,
				errors: null,
			};
		} catch (error: any) {
			if (error.statusCode) throw error;

			console.error("❌ Error al obtener las tipificaciones:", error);
			throw createError({
				statusCode: 500,
				statusMessage: "Error interno al procesar las tipificaciones",
			});
		}
	},
);

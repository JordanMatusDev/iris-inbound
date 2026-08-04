import { defineEventHandler, getQuery, createError } from "h3";
import { eq } from "drizzle-orm";
import { dbSonata, ensureServices } from "@server/db";
import { formsTable, type SonataFormSchema } from "@server/db/schema-sonata";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";

export default defineEventHandler(
	async (event): Promise<ApiResponse<SonataFormSchema>> => {
		const user = requireAuth(event);

		await ensureServices();

		const query = getQuery(event);
		const formId = query["id"] as string;

		if (!formId) {
			throw createError({
				statusCode: 400,
				statusMessage: "Debes proporcionar 'id' en la petición",
			});
		}

		try {
			const forms = await dbSonata
				.select()
				.from(formsTable)
				.where(eq(formsTable.id, Number(formId)))
				.limit(1);

			const form = forms[0];

			if (!form) {
				throw createError({
					statusCode: 404,
					statusMessage: "El formulario solicitado no existe",
				});
			}

			return {
				success: true,
				message: "Formulario obtenido con exito",
				data: form.fields,
				errors: null,
			};
		} catch (error: any) {
			if (error.statusCode) throw error;

			console.error("❌ Error al obtener el formulario:", error);
			throw createError({
				statusCode: 500,
				statusMessage: "Error interno al procesar el formulario",
			});
		}
	},
);

import { defineEventHandler, getQuery, createError } from "h3";
import { eq } from "drizzle-orm";
import { dbApp, ensureServices } from "@server/db";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";
import { irisCustomers } from "@server/db/schema-app";

export default defineEventHandler(
	async (event): Promise<ApiResponse<unknown>> => {
		const user = requireAuth(event);

		await ensureServices();

		const query = getQuery(event);
		const customerPhone = query["phone"] as string;

		if (!customerPhone) {
			throw createError({
				statusCode: 400,
				statusMessage: "Debes proporcionar 'phone' en la petición",
			});
		}

		try {
			const contactList = await dbApp
				.select()
				.from(irisCustomers)
				.where(eq(irisCustomers.phone, customerPhone))
				.limit(1);

			const contact = contactList[0];

			if (!contact) {
				throw createError({
					statusCode: 404,
					statusMessage: "El contacto solicitado no existe",
				});
			}

			// Separar de forma básica el fullName en firstName y lastName
			const nameParts = contact.fullName
				? contact.fullName.trim().split(" ")
				: [];
			const firstName = nameParts[0] || "";
			const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

			return {
				success: true,
				message: "Contacto obtenido con éxito",
				data: {
					id: contact.id,
					phone: contact.phone,
					// Devolvemos firstName y lastName calculados del fullName
					firstName: firstName,
					lastName: lastName,
					// Rellenamos los campos faltantes con null para mantener la misma estructura
					companyName: null,
					address: null,
					city: null,
					country: null,
					state: null,
					zip: null,
					phone2: null,
					phone3: null,
					email: null,
				},
				errors: null,
			};
		} catch (error: any) {
			if (error.statusCode) throw error;

			console.error("❌ Error al obtener el contacto:", error);
			throw createError({
				statusCode: 500,
				statusMessage: "Error interno al procesar el contacto",
			});
		}
	},
);

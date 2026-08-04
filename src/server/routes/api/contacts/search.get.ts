import { defineEventHandler, getQuery, createError } from "h3";
import { eq } from "drizzle-orm";
import { dbSonata, ensureServices } from "@server/db";
import { contacts } from "@server/db/schema-sonata";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";

/**
 * Función auxiliar para parsear y normalizar extraFields de Sonata
 */
function parseExtraFields(extraFieldsRaw: unknown) {
	if (!extraFieldsRaw) return {};

	let parsed: Record<string, any> = {};

	try {
		parsed =
			typeof extraFieldsRaw === "string"
				? JSON.parse(extraFieldsRaw)
				: (extraFieldsRaw as Record<string, any>);
	} catch (e) {
		console.error("⚠️ Error al parsear extraFields del contacto:", e);
		return {};
	}

	// Mapeamos y devolvemos las claves de forma uniforme
	return {
		firstName: parsed["first name"] || parsed["firstName"] || "",
		lastName: parsed["last name"] || parsed["lastName"] || "",
		companyName: parsed["company name"] || parsed["companyName"] || null,
		address: parsed["address"] || null,
		city: parsed["city"] || null,
		country: parsed["country"] || null,
		state: parsed["state"] || null,
		zip: parsed["zip"] || null,
		phone2: parsed["phone 2"] || parsed["phone2"] || null,
		phone3: parsed["phone 3"] || parsed["phone3"] || null,
		email: parsed["email"] || null,
		// Incluimos cualquier otra propiedad arbitraria que venga en el JSON
		...parsed,
	};
}

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
			const contactList = await dbSonata
				.select()
				.from(contacts)
				.where(eq(contacts.phone1, customerPhone))
				.limit(1);

			const contact = contactList[0];

			if (!contact) {
				throw createError({
					statusCode: 404,
					statusMessage: "El contacto solicitado no existe",
				});
			}

			// Deserializar y estructurar los campos
			const contactData = parseExtraFields(contact.extraFields);

			return {
				success: true,
				message: "Contacto obtenido con éxito",
				data: {
					id: contact.id,
					phone: customerPhone,
					...contactData,
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

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "@server/utils/auth";
import { saveInteractionData } from "@server/utils/payload-handler";
import { dbApp, ensureServices } from "@server/db";
import { irisCustomers } from "@server/db/schema-app";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	try {
		const user = requireAuth(event);

		await ensureServices();

		const body = await readBody(event);
		const {
			uniqueId,
			callerNumber,
			campaign,
			dispositionId,
			formData,
			fullName,
		} = body;

		if (!uniqueId) {
			throw createError({
				statusCode: 400,
				statusMessage: "El parámetro uniqueId es requerido",
			});
		}

		if (!campaign || !campaign.id) {
			throw createError({
				statusCode: 400,
				statusMessage: "La información de la campaña es requerida",
			});
		}

		if (!dispositionId) {
			throw createError({
				statusCode: 400,
				statusMessage:
					"El resultado de la llamada (dispositionId) es requerido",
			});
		}

		const customers = await dbApp
			.select()
			.from(irisCustomers)
			.where(eq(irisCustomers.phone, callerNumber))
			.limit(1);
		const customer = customers[0];

		if (fullName && !customer) {
			await dbApp.insert(irisCustomers).values({
				fullName: fullName as string,
				phone: callerNumber as string,
			});
		}

		const payload = await saveInteractionData({
			type: "inbound",
			uniqueId,
			agent: {
				id: user.id,
				name: user.username || "Agente Inbound",
				extension: user.extension || "1000",
			},
			campaign: {
				id: campaign.id,
				name: campaign.name,
				formId: campaign.sonataFormId ?? null,
			},
			disposition: {
				id: dispositionId,
			},
			customer: {
				phone: callerNumber || "Sin Número",
			},
			formData: formData ?? {},
		});

		console.dir(payload);

		if (!payload) {
			throw createError({
				statusCode: 500,
				statusMessage:
					"No se pudo procesar la grabación o generar el payload de la gestion",
			});
		}

		return {
			success: true,
			message: "Gestión Inbound procesada correctamente",
			data: payload,
		};
	} catch (error: any) {
		console.error("❌ Error al procesar gestion inbound:", error);

		if (error.statusCode) {
			throw error;
		}

		throw createError({
			statusCode: 500,
			statusMessage: "Error interno al procesar la gestion",
		});
	}
});

import { defineEventHandler, readBody } from "h3";
import { dbSonata, ensureServices } from "@server/db";
import { sql, eq } from "drizzle-orm";
import {
	campaignResultsTable,
	campaignsTable,
	users,
	dispositionsTable,
	contacts,
} from "@server/db/schema-sonata";
import saveOutboundInteraction from "@server/utils/payload-handler";
import { requireAuth } from "@server/utils/auth";

export default defineEventHandler(async (event) => {
	const user = requireAuth(event);

	const body = await readBody(event);
	const { uniqueId } = body;

	if (!uniqueId) {
		return { success: false, message: "Uniqueid requerido" };
	}

	// Ejecutamos la búsqueda en background (sin 'await' para responder rápido al cliente)
	startSonataSearchLoop(uniqueId);

	return { success: true, message: "Búsqueda programada" };
});

// Función en segundo plano con reintentos
async function startSonataSearchLoop(uniqueId: string) {
	const maxRetries = 10;
	const intervalMs = 5000; // 5 segundos

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		console.log(
			`🔍 [Intento ${attempt}/${maxRetries}] Buscando registro Sonata para ID: ${uniqueId}`,
		);

		try {
			await ensureServices();

			// Búsqueda mediante Query Builder clásico para compatibilidad con MariaDB < 10.6
			const rawResult = await dbSonata
				.select({
					result: campaignResultsTable,
					campaign: campaignsTable,
					agent: users,
					disposition: dispositionsTable,
					contact: contacts,
				})
				.from(campaignResultsTable)
				.leftJoin(
					campaignsTable,
					eq(campaignResultsTable.campaignId, campaignsTable.id),
				)
				.leftJoin(users, eq(campaignResultsTable.agentId, users.id))
				.leftJoin(
					dispositionsTable,
					eq(campaignResultsTable.dispositionId, dispositionsTable.id),
				)
				.leftJoin(contacts, eq(campaignResultsTable.contactId, contacts.id))
				.where(
					sql`JSON_SEARCH(${campaignResultsTable.fields}, 'one', ${uniqueId}) IS NOT NULL`,
				)
				.limit(1);

			if (rawResult && rawResult.length > 0) {
				// Desestructuramos el resultado del JOIN
				const { result, campaign, agent, disposition, contact } = rawResult[0];

				// Reconstruimos el objeto para mantener el tipado exacto (EnrichedCampaignsResultsTable)
				const resultData = {
					...result,
					campaign: campaign!,
					agent: agent!,
					disposition: disposition!,
					contact: contact!,
				};

				console.log(`✅ ¡Registro encontrado en el intento ${attempt}!`);

				// Creamos el payload local y armamos el JSON final
				const payload = await saveOutboundInteraction(uniqueId, resultData);

				// Imprimimos el objeto completo en consola para validarlo
				console.dir(payload, { depth: null, colors: true });

				return;
			}
		} catch (error) {
			console.error(`❌ Error en BD al buscar ID ${uniqueId}:`, error);
		}

		// Si no es el último intento, esperamos 5 segundos
		if (attempt < maxRetries) {
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}

	console.warn(
		`⚠️ Expiró el tiempo de búsqueda para ID ${uniqueId}. Se alcanzaron los 10 intentos sin éxito.`,
	);
}

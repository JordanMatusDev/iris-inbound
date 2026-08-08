// src/server/utils/process-pending.ts
import { and, eq } from "drizzle-orm";
import { dbApp, dbCdr, dbSonata, ensureServices } from "@server/db";
import {
	interactions,
	irisCampaignsResult,
	irisCustomers,
	type IrisCustomer,
} from "@server/db/schema-app";
import { contacts, type Contact } from "@server/db/schema-sonata";
import { users } from "@server/db/schema-app";
import type { CallPayload } from "@server/types/payload";
import { sendWebhookPayload } from "./calls";
import { cdrTable, type CdrTable } from "@server/db/schema-cdr";

/**
 * Limpia el objeto FormData eliminando cualquier propiedad cuyo valor coincida con el AsteriskUniqueId
 */
function cleanFormData(
	formData: Record<string, unknown> | null | undefined,
	uniqueId: string,
): Record<string, unknown> {
	if (!formData || typeof formData !== "object") {
		return {};
	}

	const cleanedData = { ...formData };

	for (const [key, value] of Object.entries(cleanedData)) {
		if (String(value).trim() === uniqueId.trim()) {
			delete cleanedData[key];
		}
	}

	return cleanedData;
}

/**
 * Extrae y concatena el nombre del cliente desde el campo JSON 'fields' de Sonata
 */
function getCustomerName(contactFields: unknown, defaultPhone: string): string {
	if (!contactFields) {
		return `Cliente ${defaultPhone}`;
	}

	try {
		// Si viene como string JSON, lo parseamos; si ya es objeto, lo usamos directo
		const parsed =
			typeof contactFields === "string"
				? JSON.parse(contactFields)
				: (contactFields as Record<string, any>);

		const firstName = parsed["first name"]?.trim() || "";
		const lastName = parsed["last name"]?.trim() || "";
		const fullName = `${firstName} ${lastName}`.trim();

		return fullName.length > 0 ? fullName : `Cliente ${defaultPhone}`;
	} catch (e) {
		// Si el JSON viene malformado, caemos en el fallback seguro
		return `Cliente ${defaultPhone}`;
	}
}

export async function processPendingInteractions() {
	await ensureServices();

	const pendingInteractions = await dbApp
		.select()
		.from(interactions)
		.where(eq(interactions.status, "pending"))
		.limit(5);

	if (pendingInteractions.length === 0) {
		console.log("ℹ️ [Task Test] No hay interacciones en estado 'pending'.");
		return;
	}

	console.log(
		`🔍 [Task Test] Se encontraron ${pendingInteractions.length} interacción(es) 'pending'. Construyendo DTOs...`,
	);

	for (const interaction of pendingInteractions) {
		try {
			const campaignResults = await dbApp
				.select()
				.from(irisCampaignsResult)
				.where(
					eq(
						irisCampaignsResult.asteriskUniqueId,
						interaction.asteriskUniqueId,
					),
				)
				.limit(1);

			const resultData = campaignResults[0];

			if (!resultData) {
				console.warn(
					`⚠️ No se encontró registro en irisCampaignsResult para AsteriskId: ${interaction.asteriskUniqueId}`,
				);
				continue;
			}
			let cdrTableResults: CdrTable[];

			if (interaction.type === "inbound") {
				cdrTableResults = await dbCdr
					.select()
					.from(cdrTable)
					.where(eq(cdrTable.linkedid, interaction.asteriskUniqueId))
					.limit(1);
			} else {
				cdrTableResults = await dbCdr
					.select()
					.from(cdrTable)
					.where(
						and(
							eq(cdrTable.linkedid, interaction.asteriskUniqueId),
							eq(cdrTable.uniqueid, interaction.asteriskUniqueId),
						),
					)
					.limit(1);
			}

			const duration = cdrTableResults[0]?.billsec ?? 0;

			const customerPhone = resultData.customerPhone || "Sin Teléfono";

			// Consultamos Sonata
			let customer: Contact | IrisCustomer | undefined;
			if (interaction.type === "outbound") {
				const inboundCustomers: Contact[] = await dbSonata
					.select()
					.from(contacts)
					.where(eq(contacts.phone1, customerPhone))
					.limit(1);

				customer = inboundCustomers[0];
			} else {
				const outboundCustomers: IrisCustomer[] = await dbApp
					.select()
					.from(irisCustomers)
					.where(eq(irisCustomers.phone, customerPhone))
					.limit(1);
				customer = outboundCustomers[0];
			}
			console.log(customer);

			// Extraemos el nombre dinámicamente desde customer.extraFields
			let customerName: string = "";

			if ("fullName" in customer) {
				customerName = customer.fullName;
			} else {
				customerName = getCustomerName(customer?.extraFields, customerPhone);
			}

			const agents = await dbApp
				.select()
				.from(users)
				.where(eq(users.id, resultData.agentId))
				.limit(1);
			const agent = agents[0];

			// Limpiamos el FormData removiendo cualquier campo cuyo valor sea el AsteriskUniqueId
			const rawFormData =
				(resultData.formData as Record<string, unknown>) ?? {};
			const cleanedFormData = cleanFormData(
				rawFormData,
				interaction.asteriskUniqueId,
			);

			const callPayload: CallPayload = {
				InteractionId: interaction.id,
				AsteriskUniqueId: interaction.asteriskUniqueId,
				CallDateTime: (interaction.createdAt ?? new Date()).toISOString(),
				FormData: cleanedFormData,
				DurationSeconds: duration,
				Campaign: {
					Id: resultData.campaignId,
					Name: `Campaña ${resultData.campaignId}`,
					Type: interaction.type === "inbound" ? "Inbound" : "Outbound",
				},
				Agent: {
					Id: resultData.agentId,
					Extension: agent.extension?.toString() || "1000",
					Name: agent.username,
				},
				Disposition: {
					Id: resultData.dispositionId,
					StatusName: `Disposición ${resultData.dispositionId}`,
				},
				Customer: {
					Id: customer?.id ?? 0,
					Phone: customerPhone,
					Name: customerName,
				},
				Recording: {
					Path: resultData.s3Url || "",
				},
			};

			const requestBody = {
				payload: callPayload,
			};

			console.log(
				`\n================ 📦 ENVIANDO PAYLOAD PARA INTERACCIÓN #${interaction.id} ================`,
			);
			console.dir(requestBody, { depth: null, colors: true });

			if (process.env["TEST"] === "false") {
				// Enviamos el webhook a la API externa
				await sendWebhookPayload(callPayload);

				// Si la llamada anterior no lanzó un error, marcamos como procesada
				await dbApp
					.update(interactions)
					.set({ status: "processed" })
					.where(eq(interactions.id, interaction.id));
			}

			console.log(
				`✅ Interacción #${interaction.id} procesada exitosamente y actualizada a status 'processed'.\n===========================================================================\n`,
			);
		} catch (error) {
			console.error(
				`❌ Error al procesar o enviar la interacción #${interaction.id}:`,
				error,
			);
			// El status permanece como 'pending' para reintentarse en el siguiente ciclo del scheduler
		}
	}
}

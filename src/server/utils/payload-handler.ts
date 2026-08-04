import { eq } from "drizzle-orm";
import { dbApp, ensureServices } from "@server/db";
import {
	interactions,
	irisCampaignsResult,
	type InteractionType,
	type NewInteraction,
	type NewIrisCampaignResult,
} from "@server/db/schema-app";
import {
	contacts,
	type EnrichedCampaignsResultsTable,
} from "@server/db/schema-sonata";
import { getAndDownloadAudio } from "./audio-handler";
import { uploadAudioToS3 } from "./s3";

// Interfaz unificada para recibir llamadas Inbound u Outbound
export interface CallPayloadInput {
	type: InteractionType;
	uniqueId: string;
	agent: {
		id: number;
		name: string;
		extension?: string | null;
	};
	campaign: {
		id: number;
		name: string;
		formId?: number | null;
	};
	disposition: {
		id: number;
		name?: string | null;
	};
	customer: {
		phone: string;
		id?: number | null;
		name?: string | null;
	};
	formData?: Record<string, unknown> | null;
	createdAt?: Date;
}

/**
 * Procesa recursos de audio y persiste la interacción + resultado en BD App.
 * Guarda la URL de S3 en irisCampaignsResult y devuelve únicamente el interactionId.
 */
export async function saveInteractionData(
	input: CallPayloadInput,
): Promise<number | null> {
	try {
		await ensureServices();

		const recfile = await getAndDownloadAudio(input.uniqueId, input.type);

		if (!recfile || !recfile.buffer) {
			console.warn(
				`⚠️ Audio no encontrado o corrupto para ID (${input.type}): ${input.uniqueId}. Abortando.`,
			);
			return null;
		}

		const s3Url = await uploadAudioToS3(
			recfile.fileName,
			recfile.buffer,
			input.type,
		);

		if (!s3Url) {
			console.warn(
				`⚠️ Falló la subida a S3 para el ID (${input.type}): ${input.uniqueId}. Abortando.`,
			);
			return null;
		}

		const interactionId = await dbApp.transaction(async (tx) => {
			const interaction: NewInteraction = {
				asteriskUniqueId: input.uniqueId,
				type: input.type,
				status: "pending",
			};

			const [interactionResult] = await tx
				.insert(interactions)
				.values(interaction);

			let id = interactionResult?.insertId;

			if (!id) {
				const existing = await tx
					.select({ id: interactions.id })
					.from(interactions)
					.where(eq(interactions.asteriskUniqueId, input.uniqueId))
					.limit(1);
				id = existing[0]?.id;
			}

			const newIrisCampaignResult: NewIrisCampaignResult = {
				asteriskUniqueId: input.uniqueId,
				agentId: input.agent.id,
				campaignId: input.campaign.id,
				customerPhone: input.customer.phone,
				dispositionId: input.disposition.id,
				formId: input.campaign.formId ?? 0,
				formData: input.formData ?? {},
				s3Url: s3Url,
			};

			await tx.insert(irisCampaignsResult).values(newIrisCampaignResult);

			return id;
		});

		if (!interactionId) {
			console.error(
				`❌ No se pudo obtener/crear el InteractionId para UniqueID: ${input.uniqueId}`,
			);
			return null;
		}

		console.log(
			`✅ Interacción e irisCampaignsResult guardados [${input.type.toUpperCase()}] [InteractionID: ${interactionId} | UniqueID: ${input.uniqueId}]`,
		);

		// Devolvemos simplemente el ID como un number
		return interactionId;
	} catch (error) {
		console.error(
			`❌ Error crítico guardando interacción (${input.type}) [ID: ${input.uniqueId}]:`,
			error,
		);
		return null;
	}
}

/**
 * Adaptador / Helper para procesar Outbound desde la tabla de Sonata
 */
export default async function saveOutboundInteraction(
	uniqueId: string,
	campaignResultsTable: EnrichedCampaignsResultsTable,
): Promise<number | null> {
	const customerPhone =
		campaignResultsTable.contact?.phone1 ||
		campaignResultsTable.phone1 ||
		"Sin Teléfono";

	return saveInteractionData({
		type: "outbound",
		uniqueId,
		agent: {
			id: campaignResultsTable.agentId,
			name: campaignResultsTable.agent.name,
			extension: campaignResultsTable.agent.deviceName || "1001",
		},
		campaign: {
			id: campaignResultsTable.campaignId,
			name: campaignResultsTable.campaign.name,
			formId: campaignResultsTable.campaign?.formId ?? 0,
		},
		disposition: {
			id: campaignResultsTable.dispositionId,
			name: campaignResultsTable.disposition?.name,
		},
		customer: {
			id: campaignResultsTable.contactId,
			phone: customerPhone,
			name: `Cliente ${customerPhone}`,
		},
		formData: campaignResultsTable.fields as Record<string, unknown>,
		createdAt: campaignResultsTable.createdAt
			? new Date(campaignResultsTable.createdAt)
			: new Date(),
	});
}

import { defineEventHandler, readBody, createError } from "h3";
import { amiClient, ensureServices } from "@server/db";
import { requireAuth } from "@server/utils/auth";
import type { ApiResponse } from "@server/types/api";

interface PauseBody {
	queueId: string;
	paused: boolean;
	reason?: string;
}

export default defineEventHandler(
	async (event): Promise<ApiResponse<string>> => {
		const user = requireAuth(event);

		await ensureServices();

		const myExt = user.extension;

		const body: PauseBody = await readBody(event);
		const rawQueueId = body?.queueId;
		const paused = body?.paused;

		if (!rawQueueId || paused === undefined) {
			throw createError({
				statusCode: 400,
				statusMessage: "Faltan parámetros obligatorios (queueId, paused)",
			});
		}

		const queueId = `Q${rawQueueId}`;
		const interfaceName = `Local/${myExt}@queue-call-to-agents/n`;

		try {
			if (!amiClient) {
				return {
					success: false,
					message: "Falta el cliente AMI",
					data: null,
					errors: null,
				};
			}

			await amiClient.sendAction({
				Action: "QueuePause",
				Queue: queueId,
				Interface: interfaceName,
				Paused: paused ? "true" : "false",
				Reason: body.reason || "",
			});

			return {
				success: true,
				message: `Extensión ${myExt} puesta en ${paused ? "PAUSA" : "READY"} en la cola ${queueId}.`,
				data: null,
				errors: null,
			};
		} catch (error: any) {
			console.error(`❌ Error al cambiar estado de pausa:`, error);

			throw createError({
				statusCode: 500,
				statusMessage:
					error.message || "Error interno al cambiar el estado en Asterisk",
			});
		}
	},
);

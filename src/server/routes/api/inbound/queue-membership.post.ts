import { defineEventHandler, readBody, createError } from "h3";
import { amiClient, ensureServices } from "@server/db";
import { requireAuth } from "@server/utils/auth";
import type { ApiResponse } from "@server/types/api";

interface QueueBody {
	queueId: string;
	action: "enter" | "leave";
}

export default defineEventHandler(
	async (event): Promise<ApiResponse<string>> => {
		const user = requireAuth(event);

		await ensureServices();

		const myExt = user.extension;

		const body: QueueBody = await readBody(event);
		const rawQueueId = body?.queueId;
		const action = body?.action;

		// Validación estricta
		if (!rawQueueId || !action || (action !== "enter" && action !== "leave")) {
			throw createError({
				statusCode: 400,
				statusMessage:
					"Faltan parámetros o la acción es inválida (debe ser 'enter' o 'leave')",
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

			const amiPayload: Record<string, string> = {
				Action: action === "enter" ? "QueueAdd" : "QueueRemove",
				Queue: queueId,
				Interface: interfaceName,
			};

			if (action === "enter") {
				amiPayload["Paused"] = "true";
				amiPayload["Penalty"] = "0";
				amiPayload["MemberName"] = user.username || myExt;
			}

			await amiClient.sendAction(amiPayload);

			return {
				success: true,
				message: `Extensión ${myExt} ${action === "enter" ? "conectada a" : "desconectada de"} la cola ${queueId}.`,
				data: null,
				errors: null,
			};
		} catch (error: any) {
			console.error(`❌ Error en acción '${action}' de la cola:`, error);
			const errorMsg = error.message || "";

			// Interceptamos los errores de Asterisk según el contexto para que el frontend no colapse
			if (action === "enter" && errorMsg.includes("Already there")) {
				return {
					success: true,
					message: "El agente ya estaba en la cola.",
					data: null,
					errors: null,
				};
			}
			if (action === "leave" && errorMsg.includes("Not there")) {
				return {
					success: true,
					message: "El agente ya estaba fuera de la cola.",
					data: null,
					errors: null,
				};
			}

			throw createError({
				statusCode: 500,
				statusMessage: errorMsg || "Error interno al modificar la cola",
			});
		}
	},
);

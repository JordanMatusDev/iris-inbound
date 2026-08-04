import type { CallPayload } from "@server/types/payload";

export async function sendWebhookPayload(callPayload: CallPayload | null) {
	if (!callPayload) {
		console.warn(
			"⚠️ Se intentó enviar un webhook con un payload nulo o indefinido.",
		);
		return { success: false, message: "Payload nulo provisto" };
	}

	try {
		const response = await $fetch(
			"https://api.integratechglobal.com/api/v1/webhook/",
			{
				method: "POST",
				body: {
					payload: callPayload,
				},
			},
		);

		return response;
	} catch (error) {
		console.error("Fallo interno al llamar a la API externa:", error);
		throw error;
	}
}

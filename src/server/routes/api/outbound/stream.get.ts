import { defineEventHandler, setHeader } from "h3";
import { amiClient, ensureServices } from "@server/db";
import { requireAuth } from "@server/utils/auth";

export default defineEventHandler(async (event) => {
	const user = requireAuth(event);
	const myExt = user.extension;

	await ensureServices();

	setHeader(event, "Content-Type", "text/event-stream");
	setHeader(event, "Cache-Control", "no-cache");
	setHeader(event, "Connection", "keep-alive");

	event.node.res.write(
		`data: ${JSON.stringify({ type: "CONNECTED", message: `Stream AMI iniciado para Ext: ${myExt}` })}\n\n`,
	);

	const handleAmiEvent = (data: Record<string, string>) => {
		const eventType = data["Event"];
		const channelStr =
			data["Interface"] ||
			data["MemberName"] ||
			data["Channel"] ||
			data["DestChannel"] ||
			"";

		// Solo procesamos el evento si contiene la extensión del usuario autenticado
		if (channelStr.includes(myExt)) {
			// Filtramos solo los eventos que la máquina de estados del frontend necesita
			if (
				eventType === "QueueMemberAdded" ||
				eventType === "QueueMemberRemoved" ||
				eventType === "AgentConnect" ||
				eventType === "BridgeEnter" ||
				eventType === "Hangup" ||
				eventType === "AgentCalled"
			) {
				const masterId = data["Linkedid"] || data["Uniqueid"];

				if (masterId) {
					data["Uniqueid"] = masterId;
				}

				event.node.res.write(
					`data: ${JSON.stringify({ type: "AMI_EVENT", payload: data })}\n\n`,
				);
			}
		}
	};

	if (amiClient) {
		amiClient.on("ami_event", handleAmiEvent);
	} else {
		console.error("⚠️ El cliente AMI no está inicializado.");
	}

	const keepAliveInterval = setInterval(() => {
		event.node.res.write(": keepalive\n\n");
	}, 15000);

	event.node.req.on("close", () => {
		console.log(`🔌 Cliente (Ext: ${myExt}) desconectado del stream SSE.`);
		clearInterval(keepAliveInterval);
		if (amiClient) {
			amiClient.off("ami_event", handleAmiEvent);
		}
		event.node.res.end();
	});
});

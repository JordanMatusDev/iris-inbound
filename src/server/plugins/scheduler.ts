import { processPendingInteractions } from "../utils/process-pending";

interface NitroApp {
	hooks: Record<string, any>;
}

export default function (nitroApp: NitroApp) {
	const INTERVAL_MS = 300000;
	if (
		import.meta.env["NODE_ENV"] === "production" &&
		!process.env["NITRO_HOST"]
	) {
		return;
	}

	console.log(
		`🚀 [Nitro Plugin] Planificador de interacciones iniciado (cada ${INTERVAL_MS / 1000}s)`,
	);

	processPendingInteractions().catch((err) => {
		console.error("❌ Error en la ejecución inicial del planificador:", err);
	});

	setInterval(async () => {
		try {
			await processPendingInteractions();
		} catch (error) {
			console.error("❌ Error ejecutando la tarea en segundo plano:", error);
		}
	}, INTERVAL_MS);
}

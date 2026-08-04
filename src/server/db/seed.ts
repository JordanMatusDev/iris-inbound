import "dotenv/config";
import bcrypt from "bcrypt";
import { dbApp, closeServices, initServices } from "./index";
import { users, localCampaigns } from "./schema-app";

async function seed() {
	console.log("🌱 Iniciando la siembra (seed) de la base de datos...");

	try {
		await initServices();

		const saltRounds = 10;

		const adminPasswordHash = await bcrypt.hash("mcpe6222", saltRounds);
		const agentPasswordHash1 = await bcrypt.hash("test1001", saltRounds);
		const agentPasswordHash2 = await bcrypt.hash("test1002", saltRounds);
		const agentPasswordHash3 = await bcrypt.hash("test1003", saltRounds);

		console.log("👤 Creando usuarios (Admin y Agente)...");
		await dbApp.insert(users).values([
			{
				username: "admin",
				passwordHash: adminPasswordHash,
				extension: "----",
				role: "admin",
				connectionStatus: true,
			},
			{
				username: "agente1001",
				passwordHash: agentPasswordHash1,
				extension: "1001",
				role: "agent",
				connectionStatus: true,
			},
			{
				username: "agente1002",
				passwordHash: agentPasswordHash2,
				extension: "1002",
				role: "agent",
				connectionStatus: true,
			},
			{
				username: "agente1003",
				passwordHash: agentPasswordHash3,
				extension: "1003",
				role: "agent",
				connectionStatus: true,
			},
		]);

		console.log("📞 Creando campaña Inbound para la cola 7000...");
		await dbApp.insert(localCampaigns).values({
			name: "Campaña Inbound 7000",
			sonataFormId: 1,
			ombutelQueueId: 7000,
		});

		console.log("\n✅ ¡Base de datos sembrada con éxito!");
		console.log("====================================");
		console.log("Credenciales de prueba:");
		console.log(
			' 👑 Admin : username "admin"   | pass "mcpe6222" | ext "----"',
		);
		console.log(
			' 🎧 Agente: username "agente1001" | pass "test1001" | ext "1001"',
		);
		console.log(
			' 🎧 Agente: username "agente1002" | pass "test1002" | ext "1002"',
		);
		console.log(
			' 🎧 Agente: username "agente1003" | pass "test1003" | ext "1003"',
		);
		console.log("====================================\n");
	} catch (error) {
		console.error("❌ Error al ejecutar el seed:", error);
	} finally {
		// Cerrar el túnel y los pools
		await closeServices();
		process.exit(0);
	}
}

seed();

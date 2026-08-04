import "dotenv/config";
import mysql from "mysql2/promise";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { createError } from "h3";
import fs from "fs/promises";

import * as schemaApp from "./schema-app";
import * as schemaCdr from "./schema-cdr";
import * as schemaOmbutel from "./schema-ombutel";
import * as schemaSonata from "./schema-sonata";

import { AmiClient } from "@server/utils/ami";

// ---------------------------------------------------------------------------
// CONFIGURACIÓN DE ENTORNOS
// ---------------------------------------------------------------------------

// Nombres de las bases de datos en el PBX
const DB_NAMES = {
	app: process.env["DB_NAME_APP"] || "contact_center",
	cdr: process.env["DB_NAME_CDR"] || "asterisk",
	ombutel: process.env["DB_NAME_OMBUTEL"] || "ombutel",
	sonata: process.env["DB_NAME_SONATA"] || "sonata_dialer",
};

// Variables de conexión directa
const DB_HOST = process.env["PBX_DB_HOST"] || "127.0.0.1";
const DB_PORT = Number(process.env["PBX_DB_PORT"]) || 3306;
const DB_USER = process.env["PBX_DB_USER"];
const DB_PASSWORD = process.env["PBX_DB_PASSWORD"];

const AMI_HOST = process.env["PBX_AMI_HOST"] || "127.0.0.1";
const AMI_PORT = Number(process.env["PBX_AMI_PORT"]) || 5038;
const AMI_USER = process.env["PBX_AMI_USER"] || "";
const AMI_PASSWORD = process.env["PBX_AMI_PASSWORD"] || "";

// ---------------------------------------------------------------------------
// ESTADO GLOBAL DE CONEXIONES
// ---------------------------------------------------------------------------
let isInitialized = false;
let pools: mysql.Pool[] = [];

export let amiClient: AmiClient | null = null;

// Instancias de Drizzle exportadas
export let dbApp: MySql2Database<typeof schemaApp>;
export let dbCdr: MySql2Database<typeof schemaCdr>;
export let dbOmbutel: MySql2Database<typeof schemaOmbutel>;
export let dbSonata: MySql2Database<typeof schemaSonata>;

/**
 * Inicializa los pools de conexión de MySQL y el cliente AMI de forma directa.
 */
export async function initServices() {
	if (isInitialized) return;

	try {
		// ==========================================
		// CONEXIONES A MYSQL
		// ==========================================
		const DB_COMMON_CONFIG = {
			host: DB_HOST,
			port: DB_PORT,
			user: DB_USER,
			password: DB_PASSWORD,
		};

		const poolApp = mysql.createPool({
			...DB_COMMON_CONFIG,
			database: DB_NAMES.app,
			waitForConnections: true,
			connectionLimit: 10,
		});
		const poolCdr = mysql.createPool({
			...DB_COMMON_CONFIG,
			database: DB_NAMES.cdr,
			waitForConnections: true,
			connectionLimit: 5,
		});
		const poolOmbutel = mysql.createPool({
			...DB_COMMON_CONFIG,
			database: DB_NAMES.ombutel,
			waitForConnections: true,
			connectionLimit: 5,
		});
		const poolSonata = mysql.createPool({
			...DB_COMMON_CONFIG,
			database: DB_NAMES.sonata,
			waitForConnections: true,
			connectionLimit: 5,
		});

		pools = [poolApp, poolCdr, poolOmbutel, poolSonata];

		dbApp = drizzle(poolApp, { schema: schemaApp, mode: "default" });
		dbCdr = drizzle(poolCdr, { schema: schemaCdr, mode: "default" });
		dbOmbutel = drizzle(poolOmbutel, {
			schema: schemaOmbutel,
			mode: "default",
		});
		dbSonata = drizzle(poolSonata, { schema: schemaSonata, mode: "default" });

		console.log(
			"⚡ Conexiones Drizzle inicializadas para las 4 bases de datos.",
		);

		// ==========================================
		// CONEXIÓN AL SERVIDOR AMI
		// ==========================================
		amiClient = new AmiClient(AMI_HOST, AMI_PORT, AMI_USER, AMI_PASSWORD);

		await amiClient.connect();
		console.log("☎️  Cliente AMI conectado y escuchando eventos.");

		isInitialized = true;
	} catch (error) {
		console.error("❌ Error inicializando servicios directos:", error);
		throw error;
	}
}

/**
 * Cierre limpio de conexiones de base de datos y AMI
 */
export async function closeServices() {
	console.log("⏳ Cerrando conexiones a la base de datos y AMI...");

	if (amiClient) {
		amiClient.disconnect();
		amiClient = null;
	}

	for (const pool of pools) {
		await pool.end();
	}
	pools = [];
	isInitialized = false;

	console.log("🔒 Conexiones cerradas correctamente.");
}

// ---------------------------------------------------------------------------
// MANEJO DE SEÑALES DE APAGADO (Graceful Shutdown)
// ---------------------------------------------------------------------------
const handleShutdown = async (signal: string) => {
	console.log(`\nSeñal ${signal} recibida.`);
	await closeServices();
	process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

/**
 * Garantiza que las conexiones estén activas antes de ejecutar consultas.
 */
export async function ensureServices() {
	try {
		await initServices();
	} catch (error) {
		console.error("Error asegurando los servicios:", error);
		throw createError({
			statusCode: 500,
			statusMessage: "Internal Server Error (DB/AMI)",
		});
	}
}

/**
 * Lee un archivo de audio directamente desde el File System.
 * Retorna un Buffer con el contenido del archivo.
 */
export async function getAudioBuffer(filePath: string): Promise<Buffer> {
	try {
		console.log(`🎙️ Leyendo archivo de audio: ${filePath}`);
		const data = await fs.readFile(filePath);
		return data;
	} catch (err: any) {
		throw new Error(`❌ Error leyendo el archivo local: ${err.message}`);
	}
}

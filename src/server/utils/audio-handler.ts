import path from "path";
import { and, eq } from "drizzle-orm";
import { dbCdr, ensureServices, getAudioBuffer } from "@server/db";
import { cdrTable } from "@server/db/schema-cdr";

type Mode = "inbound" | "outbound";

export async function getAndDownloadAudio(
	uniqueId: string,
	mode: Mode,
): Promise<{ buffer: Buffer; fileName: string } | null> {
	await ensureServices();

	let cdrRecords;

	if (mode === "inbound") {
		cdrRecords = await dbCdr
			.select({ recordingfile: cdrTable.recfile })
			.from(cdrTable)
			.where(eq(cdrTable.linkedid, uniqueId))
			.limit(1);
	} else {
		cdrRecords = await dbCdr
			.select({ recordingfile: cdrTable.recfile })
			.from(cdrTable)
			.where(
				and(eq(cdrTable.uniqueid, uniqueId), eq(cdrTable.linkedid, uniqueId)),
			)
			.limit(1);
	}

	const exactPath = cdrRecords[0]?.recordingfile;

	if (!exactPath) {
		console.warn(
			`⚠️ No se encontró ruta de grabación en CDR para ID: ${uniqueId}`,
		);
		return null;
	}

	console.log(`🎙️ Ruta encontrada en CDR: ${exactPath}`);

	try {
		const fileName = path.basename(exactPath);
		const buffer = await getAudioBuffer(exactPath);

		return { buffer, fileName };
	} catch (error) {
		console.error("❌ Error descargando audio por SFTP multiplexado:", error);
		return null;
	}
}

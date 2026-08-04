import { defineEventHandler } from "h3";
import * as fs from "fs";
import * as path from "path";

export default defineEventHandler((event) => {
	// Ruta donde montas el volumen en el contenedor
	const filePath = process.env["SCRIPT_PATH"] || "/app/script/script.md";

	try {
		if (fs.existsSync(filePath)) {
			return fs.readFileSync(filePath, "utf-8");
		}
		return "El archivo de guion no existe en la ruta especificada.";
	} catch (error) {
		return "Error al leer el archivo de guion.";
	}
});

import { H3Error } from "h3";
import type { ApiResponse } from "./types/api";

export default function (error: H3Error, event: any) {
	// Configurar los headers para devolver JSON
	event.node.res.setHeader("Content-Type", "application/json");
	event.node.res.statusCode = error.statusCode || 500;

	let formattedErrors: Record<string, string[]> | null = null;

	if (
		error.data &&
		typeof error.data === "object" &&
		!Array.isArray(error.data)
	) {
		formattedErrors = error.data as Record<string, string[]>;
	} else if (process.env["NODE_ENV"] === "development" && error.stack) {
		formattedErrors = {
			stack: error.stack.split("\n").map((line) => line.trim()),
		};
	}

	const response: ApiResponse<null> = {
		success: false,
		message:
			error.statusMessage || error.message || "Error interno del servidor",
		data: null,
		errors: formattedErrors,
	};

	event.node.res.end(JSON.stringify(response));
}

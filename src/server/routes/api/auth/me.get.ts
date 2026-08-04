import type { UserRecord } from "@server/db/schema-app";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";
import { defineEventHandler } from "h3";

export default defineEventHandler((event): ApiResponse<UserRecord> => {
	// Proteger la ruta. Si el token falla, esto lanza un error 401 automáticamente
	const user = requireAuth(event);

	return {
		success: true,
		message: "Estás autenticado correctamente",
		data: user,
		errors: null,
	};
});

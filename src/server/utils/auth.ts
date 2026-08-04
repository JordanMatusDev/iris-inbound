import type { UserRecord } from "@server/db/schema-app";
import { H3Event, getHeader, getQuery, createError } from "h3";
import jwt from "jsonwebtoken";

export function requireAuth(event: H3Event): UserRecord {
	// Extraer el header de autorización
	const authHeader = getHeader(event, "authorization");
	let token = authHeader?.split(" ")[1];

	if (!token) {
		const query = getQuery(event);
		token = query["token"] as string;
	}

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage:
				"Falta el token de autorizacion o el formato es incorrecto",
		});
	}

	// Extraer solo el token (quitando "Bearer ")
	const secret = process.env["JWT_SECRET"] || "fallback_secret_no_usar_en_prod";

	try {
		// Verificar y decodificar el token
		const decodedUser = jwt.verify(token, secret) as UserRecord;

		// Inyectar el usuario en el contexto del evento
		event.context["user"] = decodedUser;

		return decodedUser;
	} catch (error) {
		throw createError({
			statusCode: 401,
			statusMessage: "Token inválido o expirado",
		});
	}
}

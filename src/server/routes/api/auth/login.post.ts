import { defineEventHandler, readBody, createError } from "h3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { dbApp, ensureServices } from "@server/db/index";
import { users } from "@server/db/schema-app";
import type { ApiResponse } from "@server/types/api";
import type { AuthPayload, AuthRecord } from "@server/types/login";

export default defineEventHandler(
	async (event): Promise<ApiResponse<AuthRecord>> => {
		// Leer el cuerpo de la petición
		const body: AuthPayload = await readBody(event);

		if (!body || !body.username || !body.password) {
			throw createError({
				statusCode: 400,
				statusMessage: "El usuario y la contraseña son requeridos",
			});
		}

		const { username, password } = body;

		await ensureServices();

		// Buscar el usuario en la base de datos 'dbApp'
		const userResult = await dbApp
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		const user = userResult[0];

		// Si no existe, devolvemos 401 genérico
		if (!user) {
			throw createError({
				statusCode: 401,
				statusMessage: "Credenciales inválidas",
			});
		}

		// Comparar contraseñas
		const isMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isMatch) {
			throw createError({
				statusCode: 401,
				statusMessage: "Credenciales inválidas",
			});
		}

		// Generar el JWT
		const secret =
			process.env["JWT_SECRET"] || "fallback_secret_no_usar_en_prod";

		const { passwordHash, ...userRecord } = user;

		const token = jwt.sign(userRecord, secret, { expiresIn: "8h" });

		// Retornar el token y los datos del usuario
		return {
			success: true,
			message: "Inicio de sesión corecto",
			data: {
				token: token,
				user: userRecord,
			},
			errors: null,
		};
	},
);

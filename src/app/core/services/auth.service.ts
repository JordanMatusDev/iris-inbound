import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { tap } from "rxjs";
import type { UserRecord } from "@server/db/schema-app";
import type { ApiResponse } from "@server/types/api";
import type { AuthPayload, AuthRecord } from "@server/types/login";

@Injectable({
	providedIn: "root",
})
export class AuthService {
	private http = inject(HttpClient);
	private router = inject(Router);

	// Estado reactivo con Signals
	currentUser = signal<UserRecord | null>(null);
	token = signal<string | null>(null);

	constructor() {
		this.checkInitialSession();
	}

	// Verifica si ya hay sesión en el localStorage al abrir la app
	private checkInitialSession() {
		const savedToken = localStorage.getItem("token");
		const savedUser = localStorage.getItem("user");

		if (savedToken && savedUser) {
			this.token.set(savedToken);
			this.currentUser.set(JSON.parse(savedUser));
		}
	}

	login(credentials: AuthPayload) {
		return this.http
			.post<ApiResponse<AuthRecord>>("/api/auth/login", credentials)
			.pipe(
				tap((response) => {
					if (response.success && response.data) {
						// Guardar en LocalStorage
						localStorage.setItem("token", response.data.token);
						localStorage.setItem("user", JSON.stringify(response.data.user));

						// Actualizar Signals
						this.token.set(response.data.token);
						this.currentUser.set(response.data.user);
					}
				}),
			);
	}

	logout() {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		this.token.set(null);
		this.currentUser.set(null);
		this.router.navigate(["/login"]);
	}

	// Helper para saber si está autenticado rápidamente
	isAuthenticated(): boolean {
		return !!this.token();
	}
}

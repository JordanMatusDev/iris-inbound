import { type CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (authService.isAuthenticated()) {
		return true;
	}

	// Si no está autenticado, lo redirigimos al login
	return router.parseUrl("/login");
};

export const publicGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (authService.isAuthenticated()) {
		// Si ya está logueado, lo mandamos al dashboard
		return router.parseUrl("/");
	}

	return true;
};

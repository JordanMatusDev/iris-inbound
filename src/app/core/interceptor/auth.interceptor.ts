import { inject } from "@angular/core";
import type { HttpInterceptorFn } from "@angular/common/http";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const authService = inject(AuthService);
	const token = authService.token();

	// Si hay token y la petición va hacia nuestra API, lo inyectamos
	if (token && req.url.includes("/api/")) {
		const clonedRequest = req.clone({
			setHeaders: {
				Authorization: `Bearer ${token}`,
			},
		});
		return next(clonedRequest);
	}

	// Si no hay token, la petición pasa intacta
	return next(req);
};

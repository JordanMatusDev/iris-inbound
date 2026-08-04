import { Component, signal, inject } from "@angular/core";
import type { RouteMeta } from "@analogjs/router";
import {
	NonNullableFormBuilder,
	ReactiveFormsModule,
	Validators,
} from "@angular/forms";
import { AuthService } from "@app/core/services/auth.service";
import { publicGuard } from "@app/core/guards/auth.guard";
import { Router } from "@angular/router";
import { provideIcons, NgIcon } from "@ng-icons/core";
import { heroExclamationCircleSolid } from "@ng-icons/heroicons/solid";

export const routeMeta: RouteMeta = {
	canActivate: [publicGuard],
};

@Component({
	selector: "app-login",
	standalone: true,
	imports: [ReactiveFormsModule, NgIcon],
	templateUrl: "./login.page.html",
	viewProviders: [provideIcons({ heroExclamationCircleSolid })],
})
export default class Login {
	private fb = inject(NonNullableFormBuilder);
	private authService = inject(AuthService);
	private router = inject(Router);

	isLoading = signal<boolean>(false);
	errorMessage = signal<string | null>(null);
	isSubmitted = signal(false);

	loginForm = this.fb.group({
		username: this.fb.control("", [
			Validators.required,
			Validators.minLength(3),
		]),
		password: this.fb.control("", [
			Validators.required,
			Validators.minLength(6),
		]),
	});

	isFieldInvalid(field: string): boolean {
		const control = this.loginForm.get(field);
		return !!(control && control.invalid && this.isSubmitted());
	}

	async onSubmit() {
		this.isSubmitted.set(true);

		if (this.loginForm.invalid) {
			return;
		}

		this.isLoading.set(true);
		this.errorMessage.set(null);

		this.authService.login(this.loginForm.getRawValue()).subscribe({
			next: (response) => {
				if (response.success) {
					this.router.navigate(["/"]);
				}
			},
			error: (err) => {
				this.isLoading.set(false);
				this.errorMessage.set(
					err.error?.message || "Error de conexión con el servidor",
				);
			},
			complete: () => {
				this.isLoading.set(false);
			},
		});
	}
}

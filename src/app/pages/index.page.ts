import { Component, inject, signal } from "@angular/core";
import { UpperCasePipe } from "@angular/common";
import { Router } from "@angular/router";
import type { RouteMeta } from "@analogjs/router";
import { NgIcon, provideIcons } from "@ng-icons/core";
import {
	heroPhoneArrowUpRightSolid,
	heroPhoneArrowDownLeftSolid,
	heroArrowLeftStartOnRectangleSolid,
} from "@ng-icons/heroicons/solid";
import { authGuard } from "@app/core/guards/auth.guard";
import { AuthService } from "@app/core/services/auth.service";

export const routeMeta: RouteMeta = {
	canActivate: [authGuard],
};

@Component({
	selector: "app-home",
	imports: [UpperCasePipe, NgIcon],
	standalone: true,
	templateUrl: "./home.page.html",
	viewProviders: [
		provideIcons({
			heroPhoneArrowUpRightSolid,
			heroPhoneArrowDownLeftSolid,
			heroArrowLeftStartOnRectangleSolid,
		}),
	],
})
export default class Home {
	private router = inject(Router);
	private authService = inject(AuthService);

	loadingInbound = signal<boolean>(false);
	loadingOutbound = signal<boolean>(false);

	user = this.authService.currentUser;
	isHoveringInbound = false;
	isHoveringOutbound = false;

	goToInbound() {
		this.loadingInbound.set(true);
		this.router.navigate(["/inbound-dashboard"]);
	}

	goToOutbound() {
		this.loadingOutbound.set(false);
		this.router.navigate(["/outbound-dashboard"]);
	}

	logout() {
		this.authService.logout();
	}
}

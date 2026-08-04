import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
	type ApplicationConfig,
	provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideFileRouter, requestContextInterceptor } from "@analogjs/router";
import { authInterceptor } from "./core/interceptor/auth.interceptor";
import { provideMarkdown } from "ngx-markdown";

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideFileRouter(),
		provideHttpClient(
			withInterceptors([requestContextInterceptor, authInterceptor]),
		),
		provideMarkdown(),
	],
};

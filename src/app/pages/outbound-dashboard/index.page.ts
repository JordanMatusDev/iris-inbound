import { Component, inject, signal, type OnDestroy } from "@angular/core";
import { UpperCasePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import type { RouteMeta } from "@analogjs/router";
import { NgIcon, provideIcons } from "@ng-icons/core";
import {
	heroArrowLeftSolid,
	heroClipboardDocumentSolid,
	heroCheckCircleSolid,
	heroPhoneSolid,
	heroArrowPathSolid,
	heroPhoneXMarkSolid,
} from "@ng-icons/heroicons/solid";
import { authGuard } from "@app/core/guards/auth.guard";
import { AuthService } from "@app/core/services/auth.service";

export const routeMeta: RouteMeta = {
	canActivate: [authGuard],
};

type OutboundState = "IDLE" | "WAITING_CALL" | "IN_CALL" | "SAVING";

@Component({
	selector: "app-outbound-dashboard",
	imports: [UpperCasePipe, NgIcon],
	standalone: true,
	templateUrl: "./outbound-dashboard.page.html",
	viewProviders: [
		provideIcons({
			heroArrowLeftSolid,
			heroClipboardDocumentSolid,
			heroCheckCircleSolid,
			heroPhoneSolid,
			heroArrowPathSolid,
			heroPhoneXMarkSolid,
		}),
	],
})
export default class OutboundDashboardPage implements OnDestroy {
	private router = inject(Router);
	private authService = inject(AuthService);
	private http = inject(HttpClient);
	private eventSource: EventSource | null = null;

	user = this.authService.currentUser;

	currentState = signal<OutboundState>("IDLE");
	currentUniqueId = signal<string | null>(null);
	copied = signal<boolean>(false);

	readonly dialerUrl = `https://${window.location.hostname}/dialer/login`;

	constructor() {
		this.connectToOutboundStream();
	}

	goBack() {
		this.router.navigate(["/"]);
	}

	/**
	 * Solo permite copiar si la llamada ya terminó y estamos en estado SAVING
	 */
	async copyToClipboard() {
		const id = this.currentUniqueId();
		if (!id || this.currentState() !== "SAVING") return;

		try {
			await navigator.clipboard.writeText(id);
			this.copied.set(true);
		} catch (err) {
			console.error("❌ Error al copiar al portapapeles:", err);
		}
	}

	/**
	 * Envía la orden al servidor para iniciar la búsqueda recurrente en Sonata
	 * y devuelve al agente a la cola
	 */
	completeDisposition() {
		const uniqueId = this.currentUniqueId();

		if (uniqueId) {
			this.http.post("/api/calls/verify-disposition", { uniqueId }).subscribe({
				next: () =>
					console.log(
						`🚀 Verificación en segundo plano iniciada para ID: ${uniqueId}`,
					),
				error: (err) =>
					console.error("❌ Error solicitando verificación al servidor:", err),
			});
		}

		// Reiniciamos el estado del agente para la siguiente llamada
		this.currentUniqueId.set(null);
		this.copied.set(false);
		this.currentState.set("WAITING_CALL");
	}

	private connectToOutboundStream() {
		const token = this.authService.token;

		if (!token) {
			console.error("❌ No hay token disponible para conectar al stream.");
			return;
		}

		this.eventSource = new EventSource(`/api/outbound/stream?token=${token()}`);

		this.eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log("📥 Evento SSE recibido:", data);

				if (data.type === "CONNECTED") {
					this.currentState.set("IDLE");
				}

				if (data.type === "AMI_EVENT" && data.payload) {
					const amiEvent = data.payload;

					if (amiEvent.Event === "QueueMemberAdded") {
						this.currentState.set("WAITING_CALL");
					}

					if (amiEvent.Event === "QueueMemberRemoved") {
						this.currentState.set("IDLE");
						this.currentUniqueId.set(null);
						this.copied.set(false);
					}

					if (
						amiEvent.Event === "AgentConnect" ||
						amiEvent.Event === "BridgeEnter"
					) {
						if (amiEvent.Uniqueid) {
							this.currentUniqueId.set(amiEvent.Uniqueid);
							this.copied.set(false);
							this.currentState.set("IN_CALL");
						}
					}

					if (amiEvent.Event === "Hangup") {
						if (amiEvent.Uniqueid === this.currentUniqueId()) {
							console.log(
								"📞 Llamada colgada. Transicionando a estado SAVING.",
							);
							this.currentState.set("SAVING");
						}
					}
				}
			} catch (error) {
				console.error("❌ Error parseando evento SSE:", error);
			}
		};

		this.eventSource.onerror = (error) => {
			console.error(
				"❌ Error en el stream SSE, intentando reconectar...",
				error,
			);
			this.currentState.set("IDLE");

			this.eventSource?.close();

			setTimeout(() => this.connectToOutboundStream(), 5000);
		};
	}

	ngOnDestroy() {
		if (this.eventSource) {
			this.eventSource.close();
			console.log("🔌 Conexión SSE cerrada limpiamente.");
		}
	}
}

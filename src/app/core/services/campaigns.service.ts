import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { LocalCampaign } from "@server/db/schema-app";
import type {
	DispositionsTable,
	SonataFormSchema,
} from "@server/db/schema-sonata";
import type { ApiResponse } from "@server/types/api";

@Injectable({
	providedIn: "root",
})
export class CampaignsService {
	private http = inject(HttpClient);

	getCampaigns() {
		return this.http.get<ApiResponse<LocalCampaign[]>>(
			"/api/inbound/campaigns",
		);
	}

	// Conectarse a la campaña
	connectToCampaign(queueId: string) {
		return this.http.post("/api/inbound/queue-membership", {
			queueId: queueId,
			action: "enter",
		});
	}

	// Desconectarse de la campaña
	disconnectFromCampaign(queueId: string) {
		return this.http.post("/api/inbound/queue-membership", {
			queueId: queueId,
			action: "leave",
		});
	}

	togglePause(queueId: string, paused: boolean, reason: string = "") {
		return this.http.post("/api/inbound/queue-pause", {
			queueId,
			paused,
			reason,
		});
	}

	getCampaignForm(id: string) {
		return this.http.get<ApiResponse<SonataFormSchema>>(
			"/api/inbound/campaigns-form",
			{
				params: { id },
			},
		);
	}

	getDispositions() {
		return this.http.get<ApiResponse<DispositionsTable[]>>(
			"/api/inbound/campaigns-dispositions",
		);
	}
}

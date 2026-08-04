import {
	Component,
	inject,
	signal,
	type OnInit,
	type OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
	ReactiveFormsModule,
	FormGroup,
	FormControl,
	Validators,
} from "@angular/forms";
import { Router } from "@angular/router";
import type { RouteMeta } from "@analogjs/router";
import { NgIcon, provideIcons } from "@ng-icons/core";
import {
	heroArrowLeftSolid,
	heroPhoneSolid,
	heroPhoneArrowDownLeftSolid,
	heroPauseSolid,
	heroPlaySolid,
	heroCheckCircleSolid,
	heroDocumentTextSolid,
	heroChevronDownSolid,
	heroArrowDownTraySolid,
	heroXMarkSolid,
	heroCheckSolid,
} from "@ng-icons/heroicons/solid";

import { authGuard } from "@app/core/guards/auth.guard";
import { AuthService } from "@app/core/services/auth.service";
import { CampaignsService } from "@app/core/services/campaigns.service";
import type { LocalCampaign } from "@server/db/schema-app";
import {
	type DispositionsTable,
	type SonataFormField,
	type SonataFormSchema,
} from "@server/db/schema-sonata";
import { HttpClient } from "@angular/common/http";
import { MarkdownComponent } from "ngx-markdown";

export const routeMeta: RouteMeta = {
	canActivate: [authGuard],
};

type InboundState =
	"SELECT_CAMPAIGN" | "PAUSED" | "READY" | "RINGING" | "IN_CALL" | "WRAP_UP";

export interface SonataCustomerRecord {
	"first name": string;
	"last name": string;
	"company name": string | null;
	address: string | null;
	city: string | null;
	country: string | null;
	state: string | null;
	zip: string | null;
	"phone 1": string | null;
	"phone 2": string | null;
	"phone 3": string | null;
	email: string | null;
}

@Component({
	selector: "app-inbound-dashboard",
	standalone: true,
	imports: [CommonModule, NgIcon, ReactiveFormsModule, MarkdownComponent],
	templateUrl: "./inbound-dashboard.page.html",
	viewProviders: [
		provideIcons({
			heroArrowLeftSolid,
			heroPhoneSolid,
			heroPhoneArrowDownLeftSolid,
			heroPauseSolid,
			heroPlaySolid,
			heroCheckCircleSolid,
			heroDocumentTextSolid,
			heroChevronDownSolid,
			heroArrowDownTraySolid,
			heroXMarkSolid,
			heroCheckSolid,
		}),
	],
})
export default class InboundDashboardPage implements OnInit, OnDestroy {
	private authService = inject(AuthService);
	private campaignsService = inject(CampaignsService);
	private router = inject(Router);
	private http = inject(HttpClient);

	user = this.authService.currentUser;
	scriptPath = signal<string>("/api/script");

	campaigns = signal<LocalCampaign[] | null>([]);
	dispositions = signal<DispositionsTable[] | null>([]);
	isLoading = signal<boolean>(true);
	errorMessage = signal<string | null>(null);

	currentState = signal<InboundState>("SELECT_CAMPAIGN");
	activeCampaign = signal<LocalCampaign | null>(null);

	dynamicForm = signal<FormGroup>(new FormGroup({}));
	formSchema = signal<SonataFormSchema>([]);

	callerNumber = signal<string | null>(null);
	currentUniqueId = signal<string | null>(null);
	formSaved = signal<boolean>(false);

	isExistingContact = signal<boolean>(false);
	attendedCustomers = signal<SonataCustomerRecord[]>([]);
	showCsvModal = signal<boolean>(false);

	private eventSource: EventSource | null = null;

	ngOnInit(): void {
		this.fetchCampaigns();
		this.fetchDispositions();
		this.loadStoredCustomers();
	}

	ngOnDestroy(): void {
		this.disconnectStream();
	}

	private loadStoredCustomers(): void {
		try {
			const stored = sessionStorage.getItem("attended_customers_buffer");
			if (stored) {
				const parsed = JSON.parse(stored) as SonataCustomerRecord[];
				this.attendedCustomers.set(parsed);
			}
		} catch (e) {
			console.error("Error al cargar búfer de clientes:", e);
		}
	}

	private saveCustomersToStorage(customers: SonataCustomerRecord[]): void {
		sessionStorage.setItem(
			"attended_customers_buffer",
			JSON.stringify(customers),
		);
	}

	fetchDispositions(): void {
		this.isLoading.set(true);
		this.errorMessage.set(null);

		this.campaignsService.getDispositions().subscribe({
			next: (response) => {
				if (response.success && response.data) {
					this.dispositions.set(response.data);
				}
			},
			error: (err: { error?: { message?: string } }) => {
				this.isLoading.set(false);
				this.errorMessage.set(
					err.error?.message || "Error al obtener disposiciones",
				);
			},
			complete: () => {
				this.isLoading.set(false);
			},
		});
	}

	fetchCampaigns(): void {
		this.isLoading.set(true);
		this.errorMessage.set(null);

		this.campaignsService.getCampaigns().subscribe({
			next: (response) => {
				if (response.success && response.data) {
					this.campaigns.set(response.data);
				}
			},
			error: (err: { error?: { message?: string } }) => {
				this.isLoading.set(false);
				this.errorMessage.set(
					err.error?.message || "Error al obtener las campañas",
				);
			},
			complete: () => {
				this.isLoading.set(false);
			},
		});
	}

	private buildDynamicForm(schema: SonataFormSchema): void {
		const group: Record<string, FormControl> = {};

		group["disposition"] = new FormControl("", [Validators.required]);
		group["firstName"] = new FormControl("", [Validators.required]);
		group["lastName"] = new FormControl("", [Validators.required]);

		schema.forEach((field: SonataFormField) => {
			const validators = [];

			if (field.rules?.required) {
				validators.push(Validators.required);
			}

			if (field.type === "EmailField") {
				validators.push(Validators.email);
			}

			group[field.name] = new FormControl(
				{
					value: field.type === "CheckboxListGroup" ? [] : "",
					disabled: field.rules?.read_only || false,
				},
				validators,
			);
		});

		this.dynamicForm.set(new FormGroup(group));
	}

	private searchContactByPhone(phone: string): void {
		this.isExistingContact.set(false);
		if (!phone || phone === "Desconocido") return;

		this.http
			.get<{
				success: boolean;
				data?: {
					firstName?: string;
					lastName?: string;
					[key: string]: unknown;
				};
			}>(`/api/contacts/search?phone=${encodeURIComponent(phone)}`)
			.subscribe({
				next: (res) => {
					if (res.success && res.data) {
						this.isExistingContact.set(true);

						// Carga/Rellena automáticamente los campos del formulario
						this.dynamicForm().patchValue({
							firstName: res.data.firstName || "",
							lastName: res.data.lastName || "",
							...res.data,
						});
					} else {
						this.isExistingContact.set(false);
					}
				},
				error: (err) => {
					console.error("Error al consultar el contacto en la BD:", err);
					this.isExistingContact.set(false);
				},
			});
	}

	private connectToStream(): void {
		this.disconnectStream();

		const token = this.authService.token;
		if (!token) return;

		this.eventSource = new EventSource(`/api/outbound/stream?token=${token()}`);

		this.eventSource.onmessage = (event: MessageEvent<string>) => {
			try {
				const data = JSON.parse(event.data) as {
					type: string;
					payload: Record<string, string>;
				};
				if (data.type === "AMI_EVENT") {
					this.handleAmiEvent(data.payload);
				}
			} catch (err) {
				console.error("Error SSE:", err);
			}
		};
	}

	private disconnectStream(): void {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}

	private handleAmiEvent(payload: Record<string, string>): void {
		const eventType = payload["Event"];

		switch (eventType) {
			case "AgentCalled": {
				const caller =
					payload["CallerIDNum"] ||
					payload["ConnectedLineNum"] ||
					payload["CallerID"] ||
					"Desconocido";

				this.callerNumber.set(caller);
				this.currentState.set("RINGING");

				this.searchContactByPhone(caller);
				break;
			}
			case "AgentConnect": {
				const caller =
					payload["CallerIDNum"] ||
					payload["ConnectedLineNum"] ||
					payload["CallerID"] ||
					"Desconocido";
				const uniqueId = payload["Uniqueid"] || null;

				this.callerNumber.set(caller);
				this.currentUniqueId.set(uniqueId);
				this.formSaved.set(false);

				if (!this.isExistingContact()) {
					this.searchContactByPhone(caller);
				}

				this.currentState.set("IN_CALL");
				break;
			}
			case "Hangup": {
				this.handleCallHangup();
				break;
			}
			default:
				break;
		}
	}

	private handleCallHangup(): void {
		if (this.formSaved()) {
			this.finishInteraction();
		} else {
			this.currentState.set("WRAP_UP");
		}
	}

	connectToCampaign(campaign: LocalCampaign): void {
		this.activeCampaign.set(campaign);
		this.currentState.set("PAUSED");

		if (campaign.sonataFormId) {
			this.isLoading.set(true);
			this.campaignsService
				.getCampaignForm(campaign.sonataFormId.toString())
				.subscribe({
					next: (response) => {
						if (response.success && response.data) {
							this.formSchema.set(response.data);
							this.buildDynamicForm(response.data);
						}
					},
					error: (err) => console.error(err),
					complete: () => this.isLoading.set(false),
				});
		}

		this.connectToStream();

		this.campaignsService
			.connectToCampaign(campaign.ombutelQueueId.toString())
			.subscribe();
	}

	toggleReadyState(): void {
		const campaign = this.activeCampaign();
		if (!campaign) return;

		const targetPausedState = this.currentState() !== "PAUSED";

		this.campaignsService
			.togglePause(campaign.ombutelQueueId.toString(), targetPausedState)
			.subscribe({
				next: (res: any) => {
					if (res?.success) {
						this.currentState.set(targetPausedState ? "PAUSED" : "READY");
					}
				},
			});
	}

	saveForm(): void {
		const form = this.dynamicForm();

		if (form.invalid) {
			form.markAllAsTouched();
			return;
		}

		const { disposition, firstName, lastName, ...formData } = form.value as {
			disposition: string;
			firstName: string;
			lastName: string;
			[key: string]: unknown;
		};

		let payload = {
			uniqueId: this.currentUniqueId(),
			callerNumber: this.callerNumber(),
			campaign: this.activeCampaign(),
			dispositionId: disposition,
			formData,
		};

		if (!this.isExistingContact()) {
			const newPayload = { ...payload, fullName: `${firstName} ${lastName}` };
			payload = newPayload;
		}

		this.http
			.post<{
				success: boolean;
				message: string;
			}>("/api/inbound/process", payload)
			.subscribe({
				next: (response) => {
					if (response.success) {
						console.log("✅ Gestión guardada exitosamente:", response.message);
						this.formSaved.set(true);

						// Solo guardar en la lista de memoria/CSV si es un cliente NUEVO (no existente en DB)
						if (!this.isExistingContact()) {
							const newCustomer: SonataCustomerRecord = {
								"first name": firstName || "Cliente",
								"last name": lastName || "Atendido",
								"company name": null,
								address: null,
								city: null,
								country: null,
								state: null,
								zip: null,
								"phone 1": this.callerNumber(),
								"phone 2": null,
								"phone 3": null,
								email: null,
							};

							const updatedList = [...this.attendedCustomers(), newCustomer];
							this.attendedCustomers.set(updatedList);
							this.saveCustomersToStorage(updatedList);
						}

						if (this.currentState() === "WRAP_UP") {
							this.finishInteraction();
						}
					} else {
						console.error("⚠️ Error al procesar:", response.message);
					}
				},
				error: (err: unknown) => {
					console.error("❌ Error HTTP al guardar la gestión:", err);
				},
			});
	}

	finishInteraction(): void {
		this.callerNumber.set(null);
		this.currentUniqueId.set(null);
		this.formSaved.set(false);
		this.isExistingContact.set(false);
		this.dynamicForm().reset();
		this.currentState.set("READY");
	}

	goBack(): void {
		if (this.attendedCustomers().length > 0) {
			this.showCsvModal.set(true);
			return;
		}
		this.performExit();
	}

	exportCsvAndExit(): void {
		const data = this.attendedCustomers();
		if (data.length === 0) {
			this.closeCsvModalAndExit();
			return;
		}

		const headers: (keyof SonataCustomerRecord)[] = [
			"first name",
			"last name",
			"company name",
			"address",
			"city",
			"country",
			"state",
			"zip",
			"phone 1",
			"phone 2",
			"phone 3",
			"email",
		];

		const rows = data.map((customer) =>
			headers.map((header) => this.escapeCsvField(customer[header])).join(","),
		);

		const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		const dateStr = new Date().toISOString().slice(0, 10);
		link.setAttribute("href", url);
		link.setAttribute("download", `clientes_atendidos_${dateStr}.csv`);
		link.style.visibility = "hidden";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		this.closeCsvModalAndExit();
	}

	closeCsvModalAndExit(): void {
		this.showCsvModal.set(false);
		this.attendedCustomers.set([]);
		sessionStorage.removeItem("attended_customers_buffer");
		this.performExit();
	}

	private performExit(): void {
		if (this.currentState() !== "SELECT_CAMPAIGN") {
			const campaign = this.activeCampaign();
			if (campaign) {
				this.campaignsService
					.disconnectFromCampaign(campaign.ombutelQueueId.toString())
					.subscribe();
			}
			this.disconnectStream();
			this.currentState.set("SELECT_CAMPAIGN");
			this.activeCampaign.set(null);
			return;
		}
		this.router.navigate(["/"]);
	}

	private escapeCsvField(field: string | null): string {
		if (field === null || field === undefined) return '""';
		const str = String(field);
		if (str.includes(",") || str.includes('"') || str.includes("\n")) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return `"${str}"`;
	}

	isFieldVisible(field: SonataFormField): boolean {
		if (!field.conditional?.enabled) return true;

		const targetFieldName = field.conditional.field;
		if (!targetFieldName) return true;

		const targetControl = this.dynamicForm().get(targetFieldName);
		const rawValue: unknown = targetControl ? targetControl.value : "";
		const strValue =
			rawValue !== null && rawValue !== undefined ? String(rawValue) : "";
		const expectedValue = field.conditional.field_value ?? "";
		const comparison = field.conditional.comparison;

		let conditionMet = false;

		switch (comparison) {
			case "is":
				conditionMet = strValue === expectedValue;
				break;
			case "is not":
				conditionMet = strValue !== expectedValue;
				break;
			case "empty":
				conditionMet = strValue.trim() === "";
				break;
			case "not empty":
				conditionMet = strValue.trim() !== "";
				break;
			case "contains":
				conditionMet = expectedValue ? strValue.includes(expectedValue) : false;
				break;
			case "does not contain":
				conditionMet = expectedValue ? !strValue.includes(expectedValue) : true;
				break;
			default:
				conditionMet = true;
		}

		return field.conditional.action === "show" ? conditionMet : !conditionMet;
	}

	onCheckboxChange(fieldName: string, option: string, event: Event): void {
		const checked = (event.target as HTMLInputElement).checked;
		const control = this.dynamicForm().get(fieldName);
		const currentValues: string[] = Array.isArray(control?.value)
			? control.value
			: [];

		if (checked) {
			control?.setValue([...currentValues, option]);
		} else {
			control?.setValue(currentValues.filter((v: string) => v !== option));
		}
		control?.markAsTouched();
	}

	isOptionChecked(fieldName: string, option: string): boolean {
		const val: unknown = this.dynamicForm().get(fieldName)?.value;
		return Array.isArray(val) && val.includes(option);
	}
}

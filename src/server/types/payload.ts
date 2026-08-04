export interface CallPayload {
	InteractionId: number;
	AsteriskUniqueId: string;
	CallDateTime: string;
	DurationSeconds: number;
	FormData: unknown;
	Agent: {
		Id: number;
		Extension: string;
		Name: string;
	};
	Customer: {
		Id: number;
		Phone: string;
		Name: string;
	};
	Campaign: {
		Id: number;
		Name: string;
		Type: string;
	};
	Disposition: {
		Id: number;
		StatusName: string;
	};
	Recording: {
		Path: string;
	};
}

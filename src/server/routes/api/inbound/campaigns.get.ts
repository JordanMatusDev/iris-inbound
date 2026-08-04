import { dbApp, ensureServices } from "@server/db";
import { localCampaigns, type LocalCampaign } from "@server/db/schema-app";
import type { ApiResponse } from "@server/types/api";
import { requireAuth } from "@server/utils/auth";
import { defineEventHandler } from "h3";

export default defineEventHandler(
	async (event): Promise<ApiResponse<LocalCampaign[]>> => {
		const user = requireAuth(event);

		await ensureServices();

		const campaigns: LocalCampaign[] = await dbApp
			.select()
			.from(localCampaigns);

		return {
			success: true,
			message: "Lista de campañas obtenidas correctamente",
			data: campaigns,
			errors: null,
		};
	},
);

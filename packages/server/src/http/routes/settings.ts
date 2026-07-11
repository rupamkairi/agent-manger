import { SettingsPatchSchema, SettingsSchema } from "@weave/shared";
import { getSettings, patchSettings } from "../../services/settings";
import { ok } from "../respond";
import { validateBody } from "../validate";
import type { RegisterRoutes } from "./types";

export const registerSettingsRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/settings", async () => ok(await getSettings(db), SettingsSchema));

  router.patch("/api/v1/settings", async ({ request }) => {
    const patch = await validateBody(request, SettingsPatchSchema);
    return ok(await patchSettings(db, patch), SettingsSchema);
  });
};

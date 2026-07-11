import { ResourceContentSchema } from "@weave/shared";
import { getResourceContent } from "../../services/resources";
import { err, ok } from "../respond";
import type { RegisterRoutes } from "./types";

export const registerResourceRoutes: RegisterRoutes = (router, { db }) => {
  router.get("/api/v1/resources/:id/content", async ({ params }) => {
    const content = await getResourceContent(db, params.id!);
    if (!content) return err("not_found", `Readable file resource not found: ${params.id}`, 404);
    return ok(content, ResourceContentSchema);
  });
};

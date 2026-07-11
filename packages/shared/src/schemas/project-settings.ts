import { z } from "zod";
import { AGENT_IDS } from "../constants";

export const ProjectSettingsSchema = z.object({
  ignoredPaths: z.array(z.string()).default([]),
  customResourcePaths: z.array(z.string()).default([]),
  preferredAgents: z.array(z.enum(AGENT_IDS)).default([]),
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export const ProjectSettingsPatchSchema = ProjectSettingsSchema.partial();
export type ProjectSettingsPatch = z.infer<typeof ProjectSettingsPatchSchema>;

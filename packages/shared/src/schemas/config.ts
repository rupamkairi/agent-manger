import { z } from "zod";
import { ConfigResourceSchema } from "./resource";

export const ConfigFormatSchema = z.enum(["json", "toml", "markdown", "other"]);
export type ConfigFormat = z.infer<typeof ConfigFormatSchema>;

export const ConfigSchema = ConfigResourceSchema.shape.config;
export type Config = z.infer<typeof ConfigSchema>;

export const ConfigListSchema = z.array(ConfigResourceSchema);
export type ConfigList = z.infer<typeof ConfigListSchema>;

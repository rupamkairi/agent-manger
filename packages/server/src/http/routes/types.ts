import type { Db } from "../../db/client";
import type { Router } from "../../router";

export interface RouteDeps {
  db: Db;
}

export type RegisterRoutes = (router: Router, deps: RouteDeps) => void;

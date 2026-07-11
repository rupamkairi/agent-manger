export type RouteHandler = (ctx: RouteContext) => Promise<Response> | Response;

export interface RouteContext {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
}

interface Route {
  method: string;
  segments: string[];
  handler: RouteHandler;
}

export interface RouteMatch {
  handler: RouteHandler;
  params: Record<string, string>;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: RouteHandler): void {
    this.routes.push({
      method: method.toUpperCase(),
      segments: path.split("/").filter(Boolean),
      handler,
    });
  }

  get(path: string, handler: RouteHandler): void {
    this.add("GET", path, handler);
  }
  post(path: string, handler: RouteHandler): void {
    this.add("POST", path, handler);
  }
  patch(path: string, handler: RouteHandler): void {
    this.add("PATCH", path, handler);
  }
  put(path: string, handler: RouteHandler): void {
    this.add("PUT", path, handler);
  }
  delete(path: string, handler: RouteHandler): void {
    this.add("DELETE", path, handler);
  }

  match(method: string, pathname: string): RouteMatch | null {
    const parts = pathname.split("/").filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let matched = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i]!;
        const part = parts[i]!;
        if (seg.startsWith(":")) {
          params[seg.slice(1)] = decodeURIComponent(part);
        } else if (seg !== part) {
          matched = false;
          break;
        }
      }
      if (matched) return { handler: route.handler, params };
    }
    return null;
  }
}

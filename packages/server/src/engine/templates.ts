export interface TemplateContext {
  inputs: Record<string, unknown>;
  steps: Record<string, string | null>;
}

export function resolveExpression(expression: string, context: TemplateContext): unknown {
  const trimmed = expression
    .trim()
    .replace(/^(?:\$\{\{|\{\{)\s*/, "")
    .replace(/\s*\}\}$/, "");
  const input = /^inputs\.([a-zA-Z0-9_-]+)$/.exec(trimmed);
  if (input) return context.inputs[input[1]!];
  const step = /^steps\.([a-z0-9-]+)\.output$/.exec(trimmed);
  if (step) return context.steps[step[1]!] ?? null;
  return expression;
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\$?\{\{\s*([^}]+?)\s*\}\}/g, (whole, expression: string) => {
    const value = resolveExpression(expression, context);
    return value === undefined ? whole : typeof value === "string" ? value : JSON.stringify(value);
  });
}

export function captureOutput(raw: string, mode: "stdout" | "lastLine" | "jsonBlock"): string {
  if (mode === "stdout") return raw;
  if (mode === "lastLine") return raw.trimEnd().split(/\r?\n/).at(-1) ?? "";
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = (fenced?.[1] ?? raw).trim();
  JSON.parse(candidate);
  return candidate;
}

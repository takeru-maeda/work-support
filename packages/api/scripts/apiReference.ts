import { generateSpecs } from "hono-openapi";

import app from "../src/index";
import {
  apiKeyAuthMiddleware,
  jwtAuthMiddleware,
} from "../src/middleware/auth";

import type { OpenAPIV3 } from "openapi-types";

/** OpenAPI に載せない（業務のエンドポイントではない）ルート */
export const NON_API_ROUTES: readonly string[] = [
  "GET /",
  "GET /openapi",
  "GET /ui",
  // MCP の入口（/mcp は ALL で登録するので一覧に出ない）。仕様は docs/specs/mcp/spec.md
  "GET /.well-known/oauth-protected-resource",
  "GET /.well-known/oauth-protected-resource/mcp",
];

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

export interface Endpoint {
  method: string;
  /** Hono の書き方のパス（`/api/goals/:id`） */
  path: string;
  auth: "JWT" | "API キー" | "なし";
  description: string;
  pathParams: string[];
  queryParams: string[];
  bodyFields: string[];
  statuses: string[];
}

const toHonoPath = (openApiPath: string): string =>
  openApiPath.replace(/\{(\w+)\}/g, ":$1");

/** Hono 自身のルーターで照合し、そのルートにかかる認証のミドルウェアを調べる */
const authOf = (method: string, honoPath: string): Endpoint["auth"] => {
  const concretePath: string = honoPath.replace(/:\w+/g, "1");
  const [matches] = app.router.match(method, concretePath);
  // 登録順に並ぶ。`/api/effort/*` の JWT は `/api/effort` にも当たるが、先に登録した GAS のルートが
  // API キーで検証して応答を返すので、最初に当たった認証を採る
  for (const [[handler]] of matches) {
    if (handler === jwtAuthMiddleware) return "JWT";
    if (handler === apiKeyAuthMiddleware) return "API キー";
  }
  return "なし";
};

const bodyFieldsOf = (operation: OpenAPIV3.OperationObject): string[] => {
  const body = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  const schema = body?.content["application/json"]?.schema as
    | OpenAPIV3.SchemaObject
    | undefined;
  return Object.keys(schema?.properties ?? {});
};

/**
 * OpenAPI の定義（`describeRoute` と `validator`）から、エンドポイントの一覧を作ります。
 *
 * @returns メソッドとパスの順に並べたエンドポイント
 */
export const collectEndpoints = async (): Promise<Endpoint[]> => {
  const spec = await generateSpecs(app);
  const endpoints: Endpoint[] = [];
  for (const [openApiPath, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const operation = (item as OpenAPIV3.PathItemObject)[method];
      if (!operation) continue;
      const params = (operation.parameters ??
        []) as OpenAPIV3.ParameterObject[];
      const path: string = toHonoPath(openApiPath);
      endpoints.push({
        method: method.toUpperCase(),
        path,
        auth: authOf(method.toUpperCase(), path),
        description: operation.description ?? "",
        pathParams: params.filter((p) => p.in === "path").map((p) => p.name),
        queryParams: params.filter((p) => p.in === "query").map((p) => p.name),
        bodyFields: bodyFieldsOf(operation),
        statuses: Object.keys(operation.responses ?? {}),
      });
    }
  }
  return endpoints.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
};

/**
 * Hono に登録されているのに、OpenAPI の定義に出ないルートを返します（`describeRoute` の書き漏れ）。
 *
 * @param endpoints `collectEndpoints` の結果
 * @returns `METHOD /path` の一覧
 */
export const findUndocumentedRoutes = (endpoints: Endpoint[]): string[] => {
  const documented = new Set(endpoints.map((e) => `${e.method} ${e.path}`));
  const registered = new Set(
    app.routes
      .filter((r) => r.method !== "ALL")
      .map((r) => `${r.method} ${r.path}`),
  );
  return [...registered].filter(
    (route) => !documented.has(route) && !NON_API_ROUTES.includes(route),
  );
};

const code = (values: string[]): string =>
  values.length === 0 ? "—" : values.map((v) => `\`${v}\``).join("、");

const featureOf = (path: string): string => path.split("/")[2] ?? "";

/**
 * `docs/reference/api.md` の自動生成の部分（印の間）を作ります。
 *
 * @param endpoints `collectEndpoints` の結果
 * @returns Markdown
 */
export const renderApiReference = (endpoints: Endpoint[]): string => {
  const lines: string[] = [];
  const features: string[] = [
    ...new Set(endpoints.map((e) => featureOf(e.path))),
  ];
  lines.push(`エンドポイントは ${endpoints.length} 個。`, "");
  for (const feature of features) {
    lines.push(
      `### ${feature}（\`packages/api/src/features/${feature}/\`）`,
      "",
      "| メソッド | パス | 認証 | 説明 | パス / クエリ | 本文の項目 | 応答 |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const e of endpoints.filter((x) => featureOf(x.path) === feature)) {
      lines.push(
        `| ${e.method} | \`${e.path}\` | ${e.auth} | ${e.description || "—"} | ${code([...e.pathParams, ...e.queryParams])} | ${code(e.bodyFields)} | ${e.statuses.join(", ")} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
};

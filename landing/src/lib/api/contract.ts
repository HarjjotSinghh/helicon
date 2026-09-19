import { SITE_URL } from "../site";

/**
 * The parts of the public API that other modules have to agree on: where it lives, what an error
 * looks like, and which codes exist. Everything here is plain data with no Next or React import,
 * so the OpenAPI document, the router and the tests can all read the same definitions.
 */

export const API_VERSION = "1";
export const API_BASE_PATH = "/api/v1";
export const API_BASE_URL = `${SITE_URL}${API_BASE_PATH}`;
export const API_DOCS_URL = `${SITE_URL}/developers`;
export const OPENAPI_URL = `${SITE_URL}/openapi.json`;

/**
 * Every error this API can return. Codes are stable strings rather than prose, because an agent
 * branches on the code and shows the message to a person.
 */
export const ERROR_CODES = [
  "not_found",
  "method_not_allowed",
  "invalid_parameter",
  "upstream_unavailable",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiError = {
  error: {
    code: ErrorCode;
    message: string;
    /** What to do about it. Always actionable, never a restatement of the message. */
    hint: string;
    status: number;
    documentation_url: string;
  };
};

const STATUS_FOR: Record<ErrorCode, number> = {
  not_found: 404,
  method_not_allowed: 405,
  invalid_parameter: 400,
  upstream_unavailable: 503,
};

/** The one shape every failure takes, whatever went wrong. */
export function apiError(code: ErrorCode, message: string, hint: string): ApiError {
  return {
    error: {
      code,
      message,
      hint,
      status: STATUS_FOR[code],
      documentation_url: API_DOCS_URL,
    },
  };
}

export function statusForCode(code: ErrorCode): number {
  return STATUS_FOR[code];
}

/** Headers every JSON response carries: cacheable, readable cross-origin, never indexed as a page. */
export function apiHeaders(maxAge: number): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "X-Robots-Tag": "noindex, follow",
    Vary: "Accept",
  };
}

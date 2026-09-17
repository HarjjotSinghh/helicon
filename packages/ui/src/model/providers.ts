/** Provider identity for an endpoint, from where it points rather than what it is called. */

const OPENCODE_GO_HOST = "opencode.ai";

/** The user's own Muse login, which is not an endpoint. */
export const OWN_PROVIDER = "own";

/** One key per provider for state and preferences: "own", or the endpoint's id. */
export function providerKey(endpointId: string | null | undefined): string {
  return endpointId ?? OWN_PROVIDER;
}

/** How a provider is named in the UI: the endpoint's name, or the user's own login. */
export function providerLabel(endpointId: string | null, endpoints: readonly { id: string; name: string }[]): string {
  if (!endpointId) {
    return "Muse — your own login";
  }
  return endpoints.find((endpoint) => endpoint.id === endpointId)?.name ?? endpointId;
}

/**
 * Whether an endpoint's base URL is the OpenCode gateway. The host decides, so a renamed
 * endpoint keeps its mark; anything unparseable, missing, or a lookalike host is not it.
 */
export function isOpenCodeGoEndpoint(baseUrl: string | null | undefined): boolean {
  if (!baseUrl) {
    return false;
  }
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === OPENCODE_GO_HOST || host.endsWith(`.${OPENCODE_GO_HOST}`);
}

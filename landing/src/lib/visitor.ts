import { cookies, headers } from "next/headers";
import { ANON_COOKIE, VISITOR_OS_HEADER, isVisitorOs, parseVisitorOs, type VisitorOs } from "./os";

export async function getVisitorOs(): Promise<VisitorOs> {
  const headerStore = await headers();
  const marked = headerStore.get(VISITOR_OS_HEADER);
  if (isVisitorOs(marked)) return marked;
  return parseVisitorOs(headerStore.get("user-agent") ?? "");
}

export async function getAnonId(): Promise<string> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE)?.value ?? "anonymous";
}

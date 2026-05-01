import { redirect } from "next/navigation";

/**
 * Root workspace page redirects to /chat.
 * Handles backward compatibility for `?session=xxx` and capability/tool
 * query strings (e.g. links shared from older chat sessions).
 *
 * Phase 0.5.1: server-side redirect (was client `useEffect → router.replace`)
 * — no flash of empty content while client hydrates.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const sessionId =
    typeof params.session === "string" ? params.session : undefined;
  const capability =
    typeof params.capability === "string" ? params.capability : undefined;
  const toolValue = params.tool;
  const tools = Array.isArray(toolValue)
    ? toolValue
    : typeof toolValue === "string"
      ? [toolValue]
      : [];

  let target = sessionId ? `/chat/${sessionId}` : "/chat";

  const query: string[] = [];
  if (capability) query.push(`capability=${encodeURIComponent(capability)}`);
  tools.forEach((t) => query.push(`tool=${encodeURIComponent(t)}`));
  if (query.length) target += `?${query.join("&")}`;

  redirect(target);
}

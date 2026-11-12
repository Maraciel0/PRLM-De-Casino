import { requireOperator, assertCsrf } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsInput } from "@/lib/validation";
import { route, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => { await requireOperator(); return json({ settings: await getSettings() }); });

export const PATCH = route(async (req: Request) => {
  await assertCsrf(req);
  await requireOperator();
  const patch = settingsInput.parse(await req.json());
  await updateSettings(patch);
  return json({ settings: await getSettings() });
});
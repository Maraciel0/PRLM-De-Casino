import { getUser } from "@/lib/auth";
import Welcome from "@/components/Welcome";
import Home from "@/components/Home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getUser();
  return user ? <Home /> : <Welcome />;
}

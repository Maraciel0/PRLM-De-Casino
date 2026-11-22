import { getUser } from "@/lib/auth";
import Welcome from "@/components/Welcome";
import Home from "@/components/Home";
import Announcements from "@/components/Announcements";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getUser();
  return (
    <div className="space-y-6">
      <Announcements />
      {user ? <Home /> : <Welcome />}
    </div>
  );
}

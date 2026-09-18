import { redirect } from "next/navigation";
import { getSession, homePathFor } from "@/lib/data";

export default async function HomePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(await homePathFor(user));
}

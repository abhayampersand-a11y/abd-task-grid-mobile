import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

/** Entry route — `AuthGate` has already resolved the session by this point. */
export default function Index() {
  const { user } = useAuth();

  if (!user) return <Redirect href="/sign-in" />;
  return <Redirect href={user.role === "ADMIN" ? "/admin" : "/dashboard"} />;
}

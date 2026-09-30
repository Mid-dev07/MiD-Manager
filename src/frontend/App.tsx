import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createApiClient } from "./api/client";
import { createAuthClient } from "./auth/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;
    const auth = createAuthClient(supabaseUrl, supabaseKey);
    void auth.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = auth.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setApiStatus("loading");
    void createApiClient()
      .get<{ status: string }>("/api/health")
      .then(() => setApiStatus("ready"))
      .catch(() => setApiStatus("error"));
  }, []);

  return (
    <main>
      <p>MiD Manager</p>
      <h1>Technical foundation</h1>
      <p>Application shell only. Feature modules are intentionally out of scope.</p>
      <dl>
        <dt>Auth</dt>
        <dd>{user ? "Authenticated" : "Not authenticated"}</dd>
        <dt>API</dt>
        <dd>{apiStatus}</dd>
      </dl>
    </main>
  );
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Coach is the primary experience. Land users straight in the conversation.
    if (location.pathname === "/app" && !location.search) {
      // /app remains reachable for the money plan view; no forced redirect here.
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitSchema = z.object({
  rating: z.enum(["up", "down"]),
  comment: z.string().max(500).default(""),
  handle: z.string().max(60).default(""),
  page: z.string().max(200).default(""),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ua = (getRequestHeader("user-agent") ?? "").slice(0, 500);

    // Try to identify the user if a bearer token was sent (optional).
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token.split(".").length === 3) {
        const { data: claimsData } = await supabaseAdmin.auth.getClaims(token);
        if (claimsData?.claims?.sub) userId = claimsData.claims.sub;
      }
    }

    const { error } = await supabaseAdmin.from("feedback").insert({
      rating: data.rating,
      comment: data.comment.trim().slice(0, 500),
      handle: data.handle.trim().slice(0, 60),
      page: data.page.slice(0, 200),
      user_agent: ua,
      user_id: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const deleteFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("feedback").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

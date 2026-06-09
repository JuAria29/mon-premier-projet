import { createSupabaseServiceClient } from "@/lib/supabase";
import type { Mail, GraphTask, NotePageItem } from "@/types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function getStoredToken(userId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("microsoft_tokens")
    .select("access_token, expires_at, refresh_token")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  if (expiresAt > new Date(Date.now() + 60_000)) {
    return data.access_token;
  }

  if (!data.refresh_token) return null;
  return refreshAccessToken(userId, data.refresh_token);
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "User.Read Mail.Read Tasks.ReadWrite Notes.Read offline_access",
      }),
    }
  );

  if (!res.ok) throw new Error("Token refresh failed");

  const json = await res.json();
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const supabase = createSupabaseServiceClient();
  await supabase.from("microsoft_tokens").upsert({
    user_id: userId,
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return json.access_token;
}

async function graphFetch(token: string, path: string) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getEmails(userId: string, count = 20): Promise<Mail[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    `/me/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,body`
  );

  return (data.value ?? []).map((m: Record<string, unknown>) => {
    const fromObj = m.from as { emailAddress?: { name?: string; address?: string } };
    const bodyObj = m.body as { content?: string };
    return {
      id: m.id as string,
      subject: (m.subject as string) || "(sans objet)",
      from: fromObj?.emailAddress?.name || fromObj?.emailAddress?.address || "",
      fromEmail: fromObj?.emailAddress?.address || "",
      date: m.receivedDateTime as string,
      body: bodyObj?.content || "",
      preview: (m.bodyPreview as string) || "",
    };
  });
}

export async function getTasks(userId: string): Promise<GraphTask[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const listsData = await graphFetch(token, "/me/todo/lists");
  const lists: { id: string; displayName: string }[] = listsData.value ?? [];

  const allTasks: GraphTask[] = [];
  for (const list of lists.slice(0, 5)) {
    const tasksData = await graphFetch(
      token,
      `/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'&$top=20`
    );
    const tasks: GraphTask[] = (tasksData.value ?? []).map((t: Record<string, unknown>) => {
      const due = t.dueDateTime as { dateTime?: string } | undefined;
      return {
        id: t.id as string,
        title: t.title as string,
        status: t.status as string,
        importance: t.importance as string,
        dueDateTime: due?.dateTime,
        listName: list.displayName,
      };
    });
    allTasks.push(...tasks);
  }

  return allTasks;
}

export async function getNotePages(userId: string): Promise<NotePageItem[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    "/me/onenote/pages?$top=10&$orderby=lastModifiedDateTime desc&$select=id,title,lastModifiedDateTime,contentUrl"
  );

  return (data.value ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    title: (p.title as string) || "(sans titre)",
    lastModifiedDateTime: p.lastModifiedDateTime as string,
    contentUrl: p.contentUrl as string | undefined,
  }));
}

export async function isMicrosoftConnected(userId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("microsoft_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .single();
  return !!data;
}

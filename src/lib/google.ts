import { createSupabaseServiceClient } from "@/lib/supabase";
import type { Mail, GraphTask, MailFolder, CalendarEvent } from "@/types";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";
const GCAL_BASE = "https://www.googleapis.com/calendar/v3";
const GTASKS_BASE = "https://tasks.googleapis.com/tasks/v1";

async function getStoredToken(userId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("google_tokens")
    .select("access_token, expires_at, refresh_token")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  const expiresAt = new Date(data.expires_at);
  if (expiresAt > new Date(Date.now() + 60_000)) {
    return data.access_token;
  }

  if (!data.refresh_token) throw new Error("not_connected");
  const refreshed = await refreshAccessToken(userId, data.refresh_token);
  if (!refreshed) throw new Error("not_connected");
  return refreshed;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;

    const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
    const supabase = createSupabaseServiceClient();
    await supabase.from("google_tokens").upsert({
      user_id: userId,
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

    return json.access_token;
  } catch {
    return null;
  }
}

async function gmailGet(token: string, path: string) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function gcalGet(token: string, path: string) {
  const res = await fetch(`${GCAL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function gtasksGet(token: string, path: string) {
  const res = await fetch(`${GTASKS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Tasks API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiRequest(token: string, method: string, url: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  headers?: { name: string; value: string }[];
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function encodeBase64Url(text: string): string {
  return Buffer.from(text)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function extractBody(payload: GmailPayload): { content: string; contentType: "html" | "text" } {
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return { content: decodeBase64Url(payload.body.data), contentType: "html" };
  }
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { content: decodeBase64Url(payload.body.data), contentType: "text" };
  }
  if (payload.parts) {
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) return { content: decodeBase64Url(htmlPart.body.data), contentType: "html" };
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return { content: decodeBase64Url(textPart.body.data), contentType: "text" };
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result.content) return result;
    }
  }
  return { content: "", contentType: "text" };
}

function getHeader(payload: GmailPayload, name: string): string {
  return payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function mapGmailMessage(msg: Record<string, unknown>): Mail {
  const payload = msg.payload as GmailPayload;
  const { content, contentType } = extractBody(payload);
  const from = getHeader(payload, "From");
  const nameMatch = from.match(/^(.+?)\s*<(.+?)>$/);

  return {
    id: msg.id as string,
    subject: getHeader(payload, "Subject") || "(sans objet)",
    from: nameMatch ? nameMatch[1].replace(/['"]/g, "").trim() : from,
    fromEmail: nameMatch ? nameMatch[2] : from,
    date: new Date(parseInt(msg.internalDate as string)).toISOString(),
    body: content,
    bodyContentType: contentType,
    preview: (msg.snippet as string) || "",
  };
}

// Gmail

export async function getGmailMessages(userId: string, labelId = "INBOX", count = 30): Promise<Mail[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const listData = await gmailGet(
    token,
    `/users/me/messages?labelIds=${encodeURIComponent(labelId)}&maxResults=${count}`
  );
  const messages: { id: string }[] = listData.messages ?? [];

  const mails = await Promise.all(
    messages.map(async (m) => {
      try {
        const msg = await gmailGet(token, `/users/me/messages/${m.id}?format=full`);
        return mapGmailMessage(msg);
      } catch {
        return null;
      }
    })
  );

  return mails.filter(Boolean) as Mail[];
}

export async function getGmailMessageById(userId: string, messageId: string): Promise<Mail | null> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  try {
    const msg = await gmailGet(token, `/users/me/messages/${messageId}?format=full`);
    return mapGmailMessage(msg);
  } catch {
    return null;
  }
}

export async function getGmailLabels(userId: string): Promise<MailFolder[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await gmailGet(token, "/users/me/labels");
  const SYSTEM_LABELS = ["INBOX", "SENT", "DRAFT", "TRASH", "SPAM"];

  return (data.labels ?? [])
    .filter((l: Record<string, unknown>) =>
      SYSTEM_LABELS.includes(l.id as string) || l.type === "user"
    )
    .map((l: Record<string, unknown>) => ({
      id: l.id as string,
      displayName: l.name as string,
      unreadItemCount: (l.messagesUnread as number) ?? 0,
      totalItemCount: (l.messagesTotal as number) ?? 0,
    }));
}

export async function sendGmailReply(
  userId: string,
  threadId: string,
  originalMessageId: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const cleanSubject = subject.replace(/^Re:\s*/i, "");
  const raw = [
    `To: ${to}`,
    `Subject: Re: ${cleanSubject}`,
    `In-Reply-To: <${originalMessageId}>`,
    `References: <${originalMessageId}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const res = await apiRequest(token, "POST", `${GMAIL_BASE}/users/me/messages/send`, {
    raw: encodeBase64Url(raw),
    threadId,
  });
  if (!res.ok) throw new Error(`Gmail reply failed: ${res.status}`);
}

export async function sendNewGmail(userId: string, to: string, subject: string, body: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const res = await apiRequest(token, "POST", `${GMAIL_BASE}/users/me/messages/send`, {
    raw: encodeBase64Url(raw),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status}`);
}

export async function trashGmailMessage(userId: string, messageId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await apiRequest(token, "POST", `${GMAIL_BASE}/users/me/messages/${messageId}/trash`);
  if (!res.ok) throw new Error(`Gmail trash failed: ${res.status}`);
}

export async function moveGmailMessage(userId: string, messageId: string, addLabel: string, removeLabel: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await apiRequest(token, "POST", `${GMAIL_BASE}/users/me/messages/${messageId}/modify`, {
    addLabelIds: [addLabel],
    removeLabelIds: [removeLabel],
  });
  if (!res.ok) throw new Error(`Gmail move failed: ${res.status}`);
}

// Google Calendar

export async function getGoogleCalendarEvents(userId: string, from: string, to: string): Promise<CalendarEvent[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const params = `timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(to)}&maxResults=100&singleEvents=true&orderBy=startTime`;
  const data = await gcalGet(token, `/calendars/primary/events?${params}`);

  return (data.items ?? []).map((e: Record<string, unknown>) => {
    const startObj = e.start as { dateTime?: string; date?: string } | undefined;
    const endObj = e.end as { dateTime?: string; date?: string } | undefined;
    const org = e.organizer as { displayName?: string; email?: string } | undefined;
    return {
      id: e.id as string,
      subject: (e.summary as string) || "(sans titre)",
      start: startObj?.dateTime || startObj?.date || "",
      end: endObj?.dateTime || endObj?.date || "",
      location: (e.location as string) || undefined,
      isAllDay: !startObj?.dateTime,
      bodyPreview: ((e.description as string) || "").slice(0, 200) || undefined,
      organizer: org?.displayName || org?.email || undefined,
    };
  });
}

export async function createGoogleCalendarEvent(
  userId: string,
  subject: string,
  start: string,
  end: string,
  location?: string,
  body?: string
): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const payload: Record<string, unknown> = {
    summary: subject,
    start: { dateTime: start, timeZone: "Europe/Paris" },
    end: { dateTime: end, timeZone: "Europe/Paris" },
  };
  if (location) payload.location = location;
  if (body) payload.description = body;

  const res = await apiRequest(token, "POST", `${GCAL_BASE}/calendars/primary/events`, payload);
  if (!res.ok) throw new Error(`Calendar create failed: ${res.status}`);
}

export async function deleteGoogleCalendarEvent(userId: string, eventId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await apiRequest(token, "DELETE", `${GCAL_BASE}/calendars/primary/events/${eventId}`);
  if (!res.ok) throw new Error(`Calendar delete failed: ${res.status}`);
}

// Google Tasks

export async function getGoogleTasks(userId: string): Promise<GraphTask[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const listsData = await gtasksGet(token, "/users/@me/lists");
  const lists: { id: string; title: string }[] = listsData.items ?? [];

  const allTasks: GraphTask[] = [];
  for (const list of lists.slice(0, 10)) {
    const tasksData = await gtasksGet(
      token,
      `/lists/${list.id}/tasks?showCompleted=false&maxResults=100`
    );
    const tasks: GraphTask[] = (tasksData.items ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      title: (t.title as string) || "",
      status: t.status as string,
      importance: "normal",
      dueDateTime: t.due as string | undefined,
      listName: list.title,
      listId: list.id,
    }));
    allTasks.push(...tasks);
  }

  return allTasks;
}

export async function createGoogleTask(userId: string, listId: string, title: string, dueDate?: string): Promise<GraphTask> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const body: Record<string, unknown> = { title, status: "needsAction" };
  if (dueDate) body.due = dueDate;

  const res = await apiRequest(token, "POST", `${GTASKS_BASE}/lists/${listId}/tasks`, body);
  if (!res.ok) throw new Error(`Create task failed: ${res.status}`);
  const t = await res.json();
  return {
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    importance: "normal",
    dueDateTime: t.due as string | undefined,
    listId,
  };
}

export async function completeGoogleTask(userId: string, listId: string, taskId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await apiRequest(token, "PATCH", `${GTASKS_BASE}/lists/${listId}/tasks/${taskId}`, {
    status: "completed",
  });
  if (!res.ok) throw new Error(`Complete task failed: ${res.status}`);
}

export async function deleteGoogleTask(userId: string, listId: string, taskId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await apiRequest(token, "DELETE", `${GTASKS_BASE}/lists/${listId}/tasks/${taskId}`);
  if (!res.ok) throw new Error(`Delete task failed: ${res.status}`);
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("google_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .single();
  return !!data;
}

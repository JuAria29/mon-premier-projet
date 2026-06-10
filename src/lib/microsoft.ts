import { createSupabaseServiceClient } from "@/lib/supabase";
import type { Mail, GraphTask, NotePageItem, MailFolder, CalendarEvent, MicrosoftCalendar } from "@/types";

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

  if (!data.refresh_token) throw new Error("not_connected");
  const refreshed = await refreshAccessToken(userId, data.refresh_token);
  if (!refreshed) throw new Error("not_connected");
  return refreshed;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      // "common" must match the endpoint used in /api/microsoft/connect and /callback
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "User.Read Mail.Read Mail.Send Mail.ReadWrite Calendars.Read Calendars.ReadWrite Tasks.ReadWrite Notes.Read offline_access",
        }),
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (!json.access_token) return null;

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
  } catch {
    return null;
  }
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

async function graphRequest(token: string, method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function mapMail(m: Record<string, unknown>): Mail {
  const fromObj = m.from as { emailAddress?: { name?: string; address?: string } };
  const bodyObj = m.body as { content?: string; contentType?: string };
  return {
    id: m.id as string,
    subject: (m.subject as string) || "(sans objet)",
    from: fromObj?.emailAddress?.name || fromObj?.emailAddress?.address || "",
    fromEmail: fromObj?.emailAddress?.address || "",
    date: m.receivedDateTime as string,
    body: bodyObj?.content || "",
    bodyContentType: (bodyObj?.contentType?.toLowerCase() === "text" ? "text" : "html") as "html" | "text",
    preview: (m.bodyPreview as string) || "",
  };
}

export async function getEmails(userId: string, count = 30): Promise<Mail[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    `/me/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,body`
  );

  return (data.value ?? []).map(mapMail);
}

export async function getEmailsByFolder(userId: string, folderId: string, count = 30): Promise<Mail[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    `/me/mailFolders/${folderId}/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,body`
  );

  return (data.value ?? []).map(mapMail);
}

export async function getMailFolders(userId: string): Promise<MailFolder[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    "/me/mailFolders?$top=20&$select=id,displayName,unreadItemCount,totalItemCount"
  );

  return (data.value ?? []).map((f: Record<string, unknown>) => ({
    id: f.id as string,
    displayName: f.displayName as string,
    unreadItemCount: (f.unreadItemCount as number) ?? 0,
    totalItemCount: (f.totalItemCount as number) ?? 0,
  }));
}

export async function moveMailToFolder(userId: string, messageId: string, folderId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "PATCH", `/me/messages/${messageId}`, { parentFolderId: folderId });
  if (!res.ok) throw new Error(`Move failed: ${res.status}`);
}

export async function getTasks(userId: string): Promise<GraphTask[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const listsData = await graphFetch(token, "/me/todo/lists");
  const lists: { id: string; displayName: string }[] = listsData.value ?? [];

  const allTasks: GraphTask[] = [];
  for (const list of lists.slice(0, 10)) {
    const tasksData = await graphFetch(
      token,
      `/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'&$top=50`
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
        listId: list.id,
      };
    });
    allTasks.push(...tasks);
  }

  return allTasks;
}

export async function getTaskLists(userId: string): Promise<{ id: string; displayName: string }[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const data = await graphFetch(token, "/me/todo/lists");
  return (data.value ?? []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    displayName: l.displayName as string,
  }));
}

export async function createTask(userId: string, listId: string, title: string, dueDate?: string): Promise<GraphTask> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const body: Record<string, unknown> = { title, importance: "normal", status: "notStarted" };
  if (dueDate) body.dueDateTime = { dateTime: dueDate, timeZone: "UTC" };
  const res = await graphRequest(token, "POST", `/me/todo/lists/${listId}/tasks`, body);
  if (!res.ok) throw new Error(`Create task failed: ${res.status}`);
  const t = await res.json();
  const due = t.dueDateTime as { dateTime?: string } | undefined;
  return {
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    importance: t.importance as string,
    dueDateTime: due?.dateTime,
    listId,
  };
}

export async function deleteTask(userId: string, listId: string, taskId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "DELETE", `/me/todo/lists/${listId}/tasks/${taskId}`);
  if (!res.ok) throw new Error(`Delete task failed: ${res.status}`);
}

export async function updateTaskTitle(userId: string, listId: string, taskId: string, title: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "PATCH", `/me/todo/lists/${listId}/tasks/${taskId}`, { title });
  if (!res.ok) throw new Error(`Update task failed: ${res.status}`);
}

export async function getNotePages(userId: string): Promise<NotePageItem[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    "/me/onenote/pages?$top=20&$orderby=lastModifiedDateTime desc&$select=id,title,lastModifiedDateTime,links"
  );

  return (data.value ?? []).map((p: Record<string, unknown>) => {
    const links = p.links as { oneNoteWebUrl?: { href?: string } } | undefined;
    return {
      id: p.id as string,
      title: (p.title as string) || "(sans titre)",
      lastModifiedDateTime: p.lastModifiedDateTime as string,
      webUrl: links?.oneNoteWebUrl?.href,
    };
  });
}

export async function completeTask(userId: string, listId: string, taskId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "PATCH", `/me/todo/lists/${listId}/tasks/${taskId}`, { status: "completed" });
  if (!res.ok) throw new Error(`Graph API error ${res.status}`);
}

export async function sendReply(userId: string, messageId: string, comment: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "POST", `/me/messages/${messageId}/reply`, { comment });
  if (!res.ok) throw new Error(`Reply failed: ${res.status}`);
}

export async function deleteMail(userId: string, messageId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "DELETE", `/me/messages/${messageId}`);
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

export async function sendNewMail(userId: string, to: string, subject: string, body: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "POST", `/me/sendMail`, {
    message: {
      subject,
      body: { contentType: "Text", content: body },
      toRecipients: [{ emailAddress: { address: to } }],
    },
  });
  if (!res.ok) throw new Error(`Send failed: ${res.status}`);
}

export async function getMicrosoftCalendars(userId: string): Promise<MicrosoftCalendar[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const data = await graphFetch(
    token,
    "/me/calendars?$top=30&$select=id,name,hexColor,isDefaultCalendar,canEdit"
  );

  return (data.value ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: (c.name as string) || "Calendrier",
    hexColor: (c.hexColor as string) || "#b5612f",
    isDefaultCalendar: (c.isDefaultCalendar as boolean) || false,
    canEdit: (c.canEdit as boolean) || false,
  }));
}

function mapCalendarEvent(e: Record<string, unknown>, calendarId?: string, calendarName?: string, calendarColor?: string): CalendarEvent {
  const startObj = e.start as { dateTime?: string } | undefined;
  const endObj = e.end as { dateTime?: string } | undefined;
  const locObj = e.location as { displayName?: string } | undefined;
  const orgObj = e.organizer as { emailAddress?: { name?: string } } | undefined;
  return {
    id: e.id as string,
    subject: (e.subject as string) || "(sans titre)",
    start: startObj?.dateTime || "",
    end: endObj?.dateTime || "",
    location: locObj?.displayName || undefined,
    isAllDay: (e.isAllDay as boolean) || false,
    bodyPreview: (e.bodyPreview as string) || undefined,
    organizer: orgObj?.emailAddress?.name || undefined,
    calendarId,
    calendarName,
    calendarColor,
  };
}

export async function getCalendarEvents(userId: string, from: string, to: string, calendarIds?: string[]): Promise<CalendarEvent[]> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");

  const params = `startDateTime=${encodeURIComponent(from)}&endDateTime=${encodeURIComponent(to)}&$top=100&$select=id,subject,start,end,location,isAllDay,bodyPreview,organizer&$orderby=start/dateTime`;

  if (!calendarIds || calendarIds.length === 0) {
    const data = await graphFetch(token, `/me/calendarView?${params}`);
    return (data.value ?? []).map((e: Record<string, unknown>) => mapCalendarEvent(e));
  }

  const allEvents: CalendarEvent[] = [];
  for (const calId of calendarIds) {
    const data = await graphFetch(token, `/me/calendars/${calId}/calendarView?${params}`);
    allEvents.push(...(data.value ?? []).map((e: Record<string, unknown>) => mapCalendarEvent(e, calId)));
  }
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return allEvents;
}

export async function createCalendarEvent(
  userId: string,
  subject: string,
  start: string,
  end: string,
  location?: string,
  body?: string,
  calendarId?: string,
): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const payload: Record<string, unknown> = {
    subject,
    start: { dateTime: start, timeZone: "Europe/Paris" },
    end: { dateTime: end, timeZone: "Europe/Paris" },
  };
  if (location) payload.location = { displayName: location };
  if (body) payload.body = { contentType: "Text", content: body };

  const path = calendarId ? `/me/calendars/${calendarId}/events` : "/me/events";
  const res = await graphRequest(token, "POST", path, payload);
  if (!res.ok) throw new Error(`Create event failed: ${res.status}`);
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  const token = await getStoredToken(userId);
  if (!token) throw new Error("not_connected");
  const res = await graphRequest(token, "DELETE", `/me/events/${eventId}`);
  if (!res.ok) throw new Error(`Delete event failed: ${res.status}`);
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

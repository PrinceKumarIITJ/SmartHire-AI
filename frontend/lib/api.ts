import type {
  AnalyticsOverview, AuditReport, Candidate, ChatMessage, ChatReply, EmailDraft, ExecutiveReport,
  CopilotEvent, EvalRun, Health, InterviewQuestion, Job, JobCreatePayload, JobStatus, LlmTrace, MatchResult,
  MatchStatus, OpsOverview, RunEvent, RunSnapshot, TalentPoolItem, UploadResult,
} from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors arrive as [{loc, msg}, ...]
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join("; ");
  return "Request failed";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Only JSON bodies get a Content-Type: on GETs it would force a needless CORS preflight.
      headers: typeof init.body === "string" ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the SmartHire API at ${API_BASE}. Is the backend running?`);
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      message = detailToMessage((await res.json()).detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  health: () => request<Health>("/health"),
  analytics: () => request<AnalyticsOverview>("/analytics/overview"),

  jobs: {
    list: () => request<Job[]>("/jobs"),
    get: (id: string) => request<Job>(`/jobs/${id}`),
    create: (payload: JobCreatePayload) => request<Job>("/jobs", { method: "POST", body: json(payload) }),
    update: (id: string, payload: Partial<Pick<Job, "title" | "department" | "location" | "employment_type">> & { status?: JobStatus }) =>
      request<Job>(`/jobs/${id}`, { method: "PATCH", body: json(payload) }),
    remove: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),
    candidates: (id: string) => request<TalentPoolItem[]>(`/jobs/${id}/candidates`),
    upload: (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return request<UploadResult>(`/jobs/${id}/resumes`, { method: "POST", body: form });
    },
    run: (id: string) => request<{ message: string; candidates_processed: number }>(`/jobs/${id}/run`, { method: "POST" }),
    startRun: (id: string) => request<{ status: string; total: number }>(`/jobs/${id}/runs`, { method: "POST" }),
    runStatus: (id: string) => request<RunSnapshot>(`/jobs/${id}/runs/status`),
    /** Subscribe to live pipeline progress (SSE). Returns an unsubscribe function. */
    watchRun: (id: string, onSnapshot: (s: RunSnapshot) => void, onEvent: (e: RunEvent) => void, onError?: () => void) => {
      const source = new EventSource(`${API_BASE}/jobs/${id}/runs/events`);
      source.addEventListener("snapshot", (e) => onSnapshot(JSON.parse((e as MessageEvent).data)));
      source.onmessage = (e) => {
        const event: RunEvent = JSON.parse(e.data);
        onEvent(event);
        if (event.type === "completed" || event.type === "failed") source.close();
      };
      source.onerror = () => { source.close(); onError?.(); };
      return () => source.close();
    },
    results: (id: string) => request<MatchResult[]>(`/jobs/${id}/results`),
    exportUrl: (id: string) => `${API_BASE}/jobs/${id}/results/export`,
  },

  matches: {
    update: (id: string, payload: { status?: MatchStatus; notes?: string }) =>
      request<MatchResult>(`/matches/${id}`, { method: "PATCH", body: json(payload) }),
  },

  candidates: {
    pool: (params: { q?: string; status?: string; min_score?: number } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
      const query = qs.toString();
      return request<TalentPoolItem[]>(`/candidates${query ? `?${query}` : ""}`);
    },
    get: (id: string) => request<Candidate>(`/candidates/${id}`),
    remove: (id: string) => request<void>(`/candidates/${id}`, { method: "DELETE" }),
    match: (id: string) => request<MatchResult>(`/candidates/${id}/match`),
    chatHistory: (id: string) => request<ChatMessage[]>(`/candidates/${id}/chat`),
    clearChat: (id: string) => request<void>(`/candidates/${id}/chat`, { method: "DELETE" }),
    chat: (id: string, message: string) => request<ChatReply>(`/candidates/${id}/chat`, { method: "POST", body: json({ message }) }),
    interviewKit: (id: string, count = 8) =>
      request<{ questions: InterviewQuestion[] }>(`/candidates/${id}/interview-kit?count=${count}`, { method: "POST" }),
  },

  reports: {
    get: (jobId: string, refresh = false) => request<ExecutiveReport>(`/reports/jobs/${jobId}${refresh ? "?refresh=true" : ""}`),
  },

  audit: {
    get: (jobId: string, refresh = false) => request<AuditReport>(`/audit/${jobId}${refresh ? "?refresh=true" : ""}`),
  },

  copilot: {
    tools: () => request<{ name: string; description: string }[]>("/copilot/tools"),
    /** Stream agent events from the Copilot (POST + SSE body). */
    chat: async (
      messages: { role: "user" | "assistant"; content: string }[],
      jobId: string | undefined,
      onEvent: (e: CopilotEvent) => void,
      signal?: AbortSignal,
    ) => {
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/copilot/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, job_id: jobId || null }),
          signal,
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        throw new ApiError(0, `Cannot reach the SmartHire API at ${API_BASE}.`);
      }
      if (!res.ok || !res.body) throw new ApiError(res.status, `Copilot request failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (line) onEvent(JSON.parse(line.slice(6)));
        }
      }
    },
  },

  ops: {
    overview: (hours = 168) => request<OpsOverview>(`/ops/overview?hours=${hours}`),
    traces: (limit = 50) => request<LlmTrace[]>(`/ops/traces?limit=${limit}`),
    evals: () => request<EvalRun[]>("/ops/evals"),
    runEval: () => request<EvalRun>("/ops/evals", { method: "POST" }),
  },

  emails: {
    list: (status?: string) => request<EmailDraft[]>(`/email-drafts${status ? `?status=${status}` : ""}`),
    forJob: (jobId: string) => request<EmailDraft[]>(`/email-drafts/jobs/${jobId}`),
    update: (id: string, payload: { subject?: string; body?: string; status?: "draft" | "approved" }) =>
      request<EmailDraft>(`/email-drafts/${id}`, { method: "PATCH", body: json(payload) }),
    send: (id: string) => request<{ message: string }>(`/email-drafts/${id}/send`, { method: "POST" }),
  },
};

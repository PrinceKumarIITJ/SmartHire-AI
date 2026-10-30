export type MatchStatus = "Pending" | "Shortlisted" | "Interview" | "Rejected";
export type PoolStatus = MatchStatus | "Unprocessed";
export type JobStatus = "open" | "paused" | "closed";
export type PipelineStatus = "awaiting_resumes" | "ready" | "completed";

export interface ParsedJD {
  title: string;
  must_have_skills: string[];
  preferred_skills: string[];
  experience_years: number;
  education: string;
  role_keywords: string[];
  responsibilities: string[];
}

export interface JobStats {
  candidate_count: number;
  processed_count: number;
  shortlisted_count: number;
  interview_count: number;
  avg_score: number;
  top_score: number;
  pipeline_status: PipelineStatus;
}

export interface Job {
  id: string;
  title: string;
  raw_jd: string;
  parsed_jd: ParsedJD | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  status: JobStatus;
  created_at: string;
  stats: JobStats;
}

export interface JobCreatePayload {
  title: string;
  raw_jd: string;
  department?: string;
  location?: string;
  employment_type?: string;
}

export interface MatchResult {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  filename: string;
  semantic_score: number;
  skill_score: number;
  experience_score: number;
  project_score: number;
  education_score: number;
  final_score: number;
  confidence_score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string;
  status: MatchStatus;
  notes: string;
  status_source: "ai" | "recruiter";
  integrity_risk: IntegrityRisk;
  integrity_flags: number;
  total_experience_years: number;
  created_at: string;
}

export interface TalentPoolItem {
  candidate_id: string;
  job_id: string;
  job_title: string;
  name: string;
  email: string;
  filename: string;
  skills: string[];
  total_experience_years: number;
  final_score: number | null;
  status: PoolStatus;
  integrity_risk: IntegrityRisk;
  created_at: string;
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  filename: string;
  skills: string[];
  projects: { name: string; description: string; technologies: string[] }[];
  work_experience: { company: string; role: string; duration: string; years: number; description: string }[];
  total_experience_years: number;
  education: { degree: string; institution: string; year: string }[];
  certifications: string[];
}

export interface Candidate {
  id: string;
  job_id: string;
  filename: string;
  raw_resume_text: string;
  parsed_profile: CandidateProfile | null;
  integrity_report: IntegrityReport | null;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  message: string;
  created_at: string;
  citations?: string[];
}

export interface ChatReply {
  answer: string;
  citations: string[];
  chunks_used: string[];
}

export interface InterviewQuestion {
  question: string;
  category: string;
  rationale: string;
}

export interface ExecutiveReport {
  id: string;
  job_id: string;
  summary_text: string;
  key_strengths: string[];
  skill_gaps: string[];
  hiring_recommendations: string[];
  created_at: string;
}

export interface AuditReport {
  id: string;
  job_id: string;
  blind_scores: Record<string, { standard_score: number; blind_score: number; delta: number }>;
  disparate_impact_summary: {
    total_candidates?: number;
    standard_shortlisted?: number;
    blind_shortlisted?: number;
    standard_selection_rate?: number;
    blind_selection_rate?: number;
    disparate_impact_ratio?: number;
    disparate_impact_detected?: boolean;
    summary?: string;
  };
  created_at: string;
}

export type EmailStatus = "draft" | "approved" | "sent";

export interface EmailDraft {
  id: string;
  job_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  type: "selection" | "rejection";
  subject: string;
  body: string;
  status: EmailStatus;
  sent_at: string | null;
  created_at: string;
}

export interface UploadResult {
  message: string;
  uploaded: { candidate_id: string; filename: string; integrity_risk: IntegrityRisk }[];
  skipped: { filename: string; reason: string }[];
}

export interface Bucket {
  label: string;
  count: number;
}

export interface AnalyticsOverview {
  total_jobs: number;
  open_jobs: number;
  total_candidates: number;
  processed_candidates: number;
  shortlisted: number;
  interviews: number;
  rejected: number;
  emails_sent: number;
  emails_pending: number;
  avg_score: number;
  score_distribution: Bucket[];
  status_breakdown: Bucket[];
  top_skills: { skill: string; matched: number; missing: number }[];
  recent_activity: { kind: string; title: string; subtitle: string; href: string; timestamp: string }[];
}

export interface Health {
  status: "ok" | "degraded";
  version: string;
  environment: string;
  database: string;
  llm_providers: string[];
  smtp_configured: boolean;
  shortlist_threshold: number;
  max_upload_mb: number;
}

export type IntegrityRisk = "low" | "medium" | "high";

export interface IntegrityFlag {
  type: "hidden_text" | "prompt_injection" | "keyword_stuffing";
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  evidence: string;
}

export interface IntegrityReport {
  risk_level: IntegrityRisk;
  risk_score: number;
  flags: IntegrityFlag[];
  sanitized: boolean;
  removed_chars: number;
}

export interface RunEvent {
  type: "start" | "stage" | "progress" | "log" | "completed" | "failed";
  stage?: string;
  label?: string;
  done?: number;
  total?: number;
  message?: string;
  error?: string;
  processed?: number;
  ts?: number;
}

export interface RunSnapshot {
  job_id: string;
  status: "idle" | "running" | "completed" | "failed";
  stage?: string;
  stage_label?: string;
  done?: number;
  total?: number;
  error?: string | null;
  events?: RunEvent[];
}

export interface CopilotProposal {
  kind: "status_change" | "send_email";
  candidate_id: string;
  candidate_name: string;
  match_id?: string;
  from_status?: string;
  to_status?: MatchStatus;
  reason?: string;
  draft_id?: string;
  to?: string;
  email_type?: string;
  subject?: string;
  body_preview?: string;
}

export type CopilotEvent =
  | { type: "thinking"; message: string }
  | { type: "tool_call"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; tool: string; summary: string; output: string }
  | { type: "proposal"; proposal: CopilotProposal }
  | { type: "answer"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface OpsGroup {
  name: string;
  calls: number;
  errors: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  input_tokens: number;
  output_tokens: number;
}

export interface OpsOverview {
  window_hours: number;
  total_calls: number;
  errors: number;
  error_rate: number;
  p50_ms: number;
  p95_ms: number;
  input_tokens: number;
  output_tokens: number;
  by_agent: OpsGroup[];
  by_model: OpsGroup[];
  timeline: { hour: string; calls: number; errors: number }[];
}

export interface LlmTrace {
  id: string;
  agent: string;
  job_id: string | null;
  provider: string;
  model: string;
  status: "ok" | "error";
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  error: string;
  created_at: string;
}

export interface EvalRun {
  id: string;
  status: "running" | "completed" | "failed";
  metrics: Record<string, number | boolean>;
  details: {
    ranking?: { id: string; name: string; grade: number; score: number; status: string; skill_recall: number }[];
    guardrails?: { id: string; attack: boolean; flagged: boolean }[];
  };
  error: string;
  created_at: string;
  finished_at: string | null;
}

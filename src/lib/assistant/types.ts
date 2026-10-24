import type { Locale } from "../i18n";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantRequest {
  messages: ChatTurn[];
  lang: Locale;
  channel: "web" | "whatsapp";
  listingId?: string;
}

export interface ToolCallLog {
  name: string;
  input: unknown;
  ms: number;
}

export interface LeadStub {
  listingIds: string[];
  name: string;
  phone: string;
  consent: boolean;
}

export interface AssistantResult {
  reply: string;
  listings: string[];
  buttons?: string[];
  handover?: { reason: string };
  kb?: { title: string; url: string }[];
  lead?: LeadStub;
  engine: "claude" | "rules";
  toolCalls: ToolCallLog[];
  validation: { removed: string[] };
  latencyMs?: number;
}

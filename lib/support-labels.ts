export type SupportTicketTopic = "general" | "project" | "phone" | "knowledge_base" | "billing" | "technical";
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export const supportTopicLabels: Record<SupportTicketTopic, string> = {
  billing: "Számlázás",
  general: "Általános kérdés",
  knowledge_base: "Tudásbázis",
  phone: "Telefonos kapcsolat",
  project: "Projekt",
  technical: "Technikai hiba",
};

export const supportStatusLabels: Record<SupportTicketStatus, string> = {
  closed: "Lezárva",
  in_progress: "Folyamatban",
  open: "Nyitott",
  resolved: "Megoldva",
};

export const supportPriorityLabels: Record<SupportTicketPriority, string> = {
  high: "Magas",
  low: "Alacsony",
  normal: "Normál",
  urgent: "Sürgős",
};

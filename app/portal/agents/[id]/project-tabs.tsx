"use client";

import { AlertCircle, BellRing, Bot, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileCheck2, FileText, FolderKanban, KeyRound, Layers3, LinkIcon, Mail, MessageSquareText, Pencil, Phone, PlayCircle, Save, Settings2, Trash2, TriangleAlert, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ElevenLabsAgentWidget } from "@/app/elevenlabs-agent-widget";
import { categoryLabels, documentStatusLabels, googleAccessStatusLabels, phoneRequestLabels, statusLabels, telnyxStatusLabels, type DocumentProcessingStatus, type Project } from "@/lib/project-types";
import type { ElevenLabsConversation, ElevenLabsKnowledgeBaseDocument } from "@/lib/elevenlabs";
import { deleteProjectConversation, provisionElevenLabsAgent, updateAgentKnowledgeBaseDocument as updateAdminAgentKnowledgeBaseDocument, updateElevenLabsAgentId, updateProjectAssetFlags, updateProjectGoogleAccess, updateProjectMinuteLimits, updateProjectPhone, updateProjectSettings, type ProjectAdminActionState } from "@/app/admin/projects/[id]/actions";
import { submitProjectForReview, updateAgentKnowledgeBaseDocument as updateCustomerAgentKnowledgeBaseDocument, updateVoiceAgentSetup, uploadKnowledgeDocument, type AgentKnowledgeUpdateState, type KnowledgeUploadState, type ReviewRequestState, type VoiceSetupState } from "./actions";

type TabId = "project-settings" | "setup" | "documents" | "phone" | "google-access" | "usage" | "activity" | "live-agent";

type Tab = {
  id: TabId;
  label: string;
};

type KnowledgeTabId = "source-documents" | "agent-knowledge";

const tabs: Tab[] = [
  { id: "setup", label: "Agent beállítások" },
  { id: "documents", label: "Tudásbázis" },
  { id: "phone", label: "Telefon" },
  { id: "activity", label: "Aktivitás" },
];

const voiceInitialState: VoiceSetupState = {};
const uploadInitialState: KnowledgeUploadState = {};
const projectSettingsInitialState: ProjectAdminActionState = {};
const phoneSettingsInitialState: ProjectAdminActionState = {};
const googleAccessInitialState: ProjectAdminActionState = {};
const assetFlagsInitialState: ProjectAdminActionState = {};
const minuteLimitsInitialState: ProjectAdminActionState = {};
const elevenLabsInitialState: ProjectAdminActionState = {};
const elevenLabsIdInitialState: ProjectAdminActionState = {};
const agentKnowledgeInitialState: ProjectAdminActionState = {};
const deleteConversationInitialState: ProjectAdminActionState = {};
const customerAgentKnowledgeInitialState: AgentKnowledgeUpdateState = {};
const reviewRequestInitialState: ReviewRequestState = {};
const conversationsPerPage = 10;
const calendarWeekdays = ["H", "K", "Sz", "Cs", "P", "Sz", "V"];

const phoneDocumentLabels = {
  phone_id_copy: "Igazolvány másolat",
  phone_utility_bill: "Közüzemi számla",
  phone_company_registration: "Cégbejegyzés másolat",
} as const;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "Nincs hossz";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (!minutes) return `${remainingSeconds} mp`;
  return `${minutes} perc ${remainingSeconds} mp`;
}

function formatMinuteValue(seconds: number) {
  if (seconds <= 0) return "0 perc";
  const minutes = seconds / 60;
  if (minutes < 1) return "<1 perc";
  const rounded = minutes < 10 ? minutes.toFixed(1) : Math.round(minutes).toString();
  return `${rounded.replace(".", ",")} perc`;
}

function parseDateValue(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFilterValue(value: string) {
  const date = parseDateValue(value);
  if (!date) return "éééé. hh. nn.";
  return new Intl.DateTimeFormat("hu-HU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getCalendarGrid(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = new Date(firstOfMonth);
  firstVisibleDay.setDate(firstOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    return date;
  });
}

function DateFilterPicker({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const selectedDate = parseDateValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate ?? new Date());
    }
  }, [isOpen, value]);

  const calendarDays = useMemo(() => getCalendarGrid(viewDate), [viewDate]);
  const monthLabel = new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(viewDate);
  const selectedValue = selectedDate ? toDateValue(selectedDate) : "";
  const todayValue = toDateValue(new Date());

  return (
    <div className="conversation-filter-field date-filter-picker" ref={pickerRef}>
      <span>{label}</span>
      <button className={`date-filter-button ${value ? "has-value" : ""}`} onClick={() => setIsOpen((current) => !current)} type="button">
        <span>{formatDateFilterValue(value)}</span>
        <CalendarDays size={15} />
      </button>
      {isOpen && (
        <div className="date-filter-popover">
          <div className="date-filter-popover-header">
            <strong>{monthLabel}</strong>
            <div>
              <button aria-label="Előző hónap" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} type="button"><ChevronLeft size={16} /></button>
              <button aria-label="Következő hónap" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} type="button"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="date-filter-weekdays">
            {calendarWeekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
          </div>
          <div className="date-filter-days">
            {calendarDays.map((date) => {
              const dateValue = toDateValue(date);
              const isSelected = dateValue === selectedValue;
              const isToday = dateValue === todayValue;
              const isMuted = date.getMonth() !== viewDate.getMonth();

              return (
                <button
                  className={`${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${isMuted ? "muted" : ""}`}
                  key={dateValue}
                  onClick={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-filter-popover-actions">
            <button onClick={() => { onChange(""); setIsOpen(false); }} type="button">Törlés</button>
            <button onClick={() => { onChange(todayValue); setIsOpen(false); }} type="button">Ma</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getMonthKey(seconds: number) {
  const date = new Date(seconds * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

type OnboardingItemStatus = "ok" | "warning" | "missing";

function getOnboardingOverview(project: Project, phoneDocumentStatus: string) {
  const isVoiceAgent = project.category === "voice_agent";
  const needsPhoneDocuments = project.phoneRequestType === "local_company" || project.phoneRequestType === "local_private";
  const hasPhoneDocuments = phoneDocumentStatus === "Portálon feltöltve" || phoneDocumentStatus === "E-mailben megkapva";
  const phoneRequestValue = !isVoiceAgent
    ? "Nem szükséges"
    : project.phoneRequestType
      ? phoneRequestLabels[project.phoneRequestType]
      : project.phoneNumber
        ? "Telefonszám már rögzítve"
        : "Hiányzik";
  const agentConfigured = Boolean(project.promptAssetsReceived || (project.agentDisplayName && project.agentDisplayName !== "Nincs megadva" && project.greeting && project.callInstructions));
  const knowledgeReady = project.knowledgeAssetsReceived || (project.documents > 0 && project.documentsReady === project.documents);

  const items: Array<{ label: string; value: string; status: OnboardingItemStatus }> = [
    {
      label: "Telefonszám igény",
      value: phoneRequestValue,
      status: !isVoiceAgent || project.phoneRequestType || project.phoneNumber ? "ok" : "missing",
    },
    {
      label: "Telefonszám dokumentumok",
      value: !needsPhoneDocuments ? "Nem szükséges" : phoneDocumentStatus,
      status: !needsPhoneDocuments || hasPhoneDocuments ? "ok" : "missing",
    },
    {
      label: "Google hozzáférés",
      value: project.googleAccessRequired ? googleAccessStatusLabels[project.googleAccessStatus] : "Nem szükséges",
      status: !project.googleAccessRequired
        ? "ok"
        : project.googleAccessStatus === "working"
        ? "ok"
        : project.googleAccessStatus === "submitted" || project.googleAccessStatus === "checking"
          ? "warning"
          : "missing",
    },
    {
      label: "Tudásbázis",
      value: project.knowledgeAssetsReceived ? "Külső forrásból megvan" : project.documents > 0 ? `${project.documentsReady} / ${project.documents} kész` : "Nincs dokumentum",
      status: knowledgeReady ? "ok" : project.documents > 0 ? "warning" : "missing",
    },
    {
      label: "Agent beállítások",
      value: project.promptAssetsReceived ? "Külső forrásból megvan" : agentConfigured ? "Kitöltve" : "Hiányos",
      status: agentConfigured ? "ok" : "missing",
    },
    {
      label: "Projekt státusz",
      value: statusLabels[project.status],
      status: project.status === "live" ? "ok" : project.status === "draft" ? "missing" : "warning",
    },
  ];

  const missingCount = items.filter((item) => item.status === "missing").length;
  const warningCount = items.filter((item) => item.status === "warning").length;
  const summary = missingCount > 0
    ? "Hiányos"
    : warningCount > 0
      ? "Ellenőrzésre vár"
      : project.status === "live"
        ? "Aktív"
        : "Indítható";

  const summaryStatus: OnboardingItemStatus = missingCount > 0 ? "missing" : warningCount > 0 ? "warning" : "ok";

  return { items, summary, summaryStatus };
}

export function ProjectTabs({ adminSettings, project, completion, elevenLabsKnowledgeBase, conversations }: { adminSettings?: { canManageProjects: boolean; customerId: string; source: string }; project: Project; completion: number; elevenLabsKnowledgeBase?: { documents: ElevenLabsKnowledgeBaseDocument[]; error: string | null }; conversations?: { conversations: ElevenLabsConversation[]; error: string | null } }) {
  const isAdminView = Boolean(adminSettings);
  const canEditProject = adminSettings?.canManageProjects ?? false;
  const visibleTabs = useMemo(() => [
    { id: "project-settings" as const, label: "Projekt részletek" },
    { id: "setup" as const, label: "Agent beállítások" },
    ...(isAdminView ? [{ id: "google-access" as const, label: "Google hozzáférés" }] : []),
    { id: "documents" as const, label: "Tudásbázis" },
    ...(isAdminView ? [{ id: "phone" as const, label: "Telefon" }] : []),
    { id: "usage" as const, label: "Forgalom" },
    { id: "activity" as const, label: "Aktivitás" },
    ...(!isAdminView ? [{ id: "live-agent" as const, label: "Élő agent" }] : []),
  ], [isAdminView]);
  const searchParams = useSearchParams();
  const getInitialTab = () => {
    const requestedTab = searchParams.get("tab") as TabId | null;
    if (requestedTab && visibleTabs.some((tab) => tab.id === requestedTab)) return requestedTab;
    return "project-settings";
  };
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTabId>("agent-knowledge");
  const [selectedAgentKnowledgeDocumentId, setSelectedAgentKnowledgeDocumentId] = useState<string | null>(null);
  const [agentKnowledgeConfirmOpen, setAgentKnowledgeConfirmOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationDateFrom, setConversationDateFrom] = useState("");
  const [conversationDateTo, setConversationDateTo] = useState("");
  const [conversationMinDuration, setConversationMinDuration] = useState("");
  const [conversationMaxDuration, setConversationMaxDuration] = useState("");
  const [conversationPage, setConversationPage] = useState(1);
  const [setupState, setupAction, setupPending] = useActionState(updateVoiceAgentSetup, voiceInitialState);
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadKnowledgeDocument, uploadInitialState);
  const [projectSettingsState, projectSettingsAction, projectSettingsPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectSettings, projectSettingsInitialState);
  const [phoneSettingsState, phoneSettingsAction, phoneSettingsPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectPhone, phoneSettingsInitialState);
  const [googleAccessState, googleAccessAction, googleAccessPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectGoogleAccess, googleAccessInitialState);
  const [assetFlagsState, assetFlagsAction, assetFlagsPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectAssetFlags, assetFlagsInitialState);
  const [minuteLimitsState, minuteLimitsAction, minuteLimitsPending] = useActionState<ProjectAdminActionState, FormData>(updateProjectMinuteLimits, minuteLimitsInitialState);
  const [elevenLabsState, elevenLabsAction, elevenLabsPending] = useActionState<ProjectAdminActionState, FormData>(provisionElevenLabsAgent, elevenLabsInitialState);
  const [elevenLabsIdState, elevenLabsIdAction, elevenLabsIdPending] = useActionState<ProjectAdminActionState, FormData>(updateElevenLabsAgentId, elevenLabsIdInitialState);
  const [agentKnowledgeState, agentKnowledgeAction, agentKnowledgePending] = useActionState<ProjectAdminActionState, FormData>(updateAdminAgentKnowledgeBaseDocument, agentKnowledgeInitialState);
  const [deleteConversationState, deleteConversationAction, deleteConversationPending] = useActionState<ProjectAdminActionState, FormData>(deleteProjectConversation, deleteConversationInitialState);
  const [customerAgentKnowledgeState, customerAgentKnowledgeAction, customerAgentKnowledgePending] = useActionState<AgentKnowledgeUpdateState, FormData>(updateCustomerAgentKnowledgeBaseDocument, customerAgentKnowledgeInitialState);
  const [reviewRequestState, reviewRequestAction, reviewRequestPending] = useActionState(submitProjectForReview, reviewRequestInitialState);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!uploadState.success) return;
    uploadFormRef.current?.reset();
    router.refresh();
  }, [router, uploadState.success]);

  useEffect(() => {
    if (!setupState.success) return;
    router.refresh();
  }, [router, setupState.success]);

  useEffect(() => {
    if (!agentKnowledgeState.success) return;
    setAgentKnowledgeConfirmOpen(false);
    router.refresh();
  }, [agentKnowledgeState.success, router]);

  useEffect(() => {
    if (!customerAgentKnowledgeState.success) return;
    setAgentKnowledgeConfirmOpen(false);
    router.refresh();
  }, [customerAgentKnowledgeState.success, router]);

  useEffect(() => {
    if (!deleteConversationState.success) return;
    setSelectedConversationId(null);
    router.refresh();
  }, [deleteConversationState.success, router]);

  useEffect(() => {
    setAgentKnowledgeConfirmOpen(false);
  }, [selectedAgentKnowledgeDocumentId]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab") as TabId | null;
    if (requestedTab && visibleTabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams, visibleTabs]);

  const phoneDocuments = project.documentList.filter((document) => document.category.startsWith("phone_"));
  const agentKnowledgeDocuments = elevenLabsKnowledgeBase?.documents ?? [];
  const conversationItems = conversations?.conversations ?? [];
  const monthlyMinuteLimit = project.monthlyMinuteLimit ?? 1000;
  const carryoverMinutes = project.carryoverMinutes ?? Math.round(monthlyMinuteLimit * 0.5);
  const usageSummary = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const months = new Map<string, { conversationCount: number; seconds: number }>();
    let currentMonthSeconds = 0;
    let totalSeconds = 0;
    let totalConversationCount = 0;
    let undatedSeconds = 0;

    conversationItems.forEach((conversation) => {
      if (conversation.callDurationSecs === null) return;
      totalSeconds += conversation.callDurationSecs;
      totalConversationCount += 1;

      if (!conversation.startTimeUnix) {
        undatedSeconds += conversation.callDurationSecs;
        return;
      }

      const monthKey = getMonthKey(conversation.startTimeUnix);
      const existingMonth = months.get(monthKey) ?? { conversationCount: 0, seconds: 0 };
      existingMonth.conversationCount += 1;
      existingMonth.seconds += conversation.callDurationSecs;
      months.set(monthKey, existingMonth);

      if (monthKey === currentMonthKey) currentMonthSeconds += conversation.callDurationSecs;
    });

    if (!months.has(currentMonthKey)) {
      months.set(currentMonthKey, { conversationCount: 0, seconds: 0 });
    }

    const availableSeconds = (monthlyMinuteLimit + carryoverMinutes) * 60;
    const remainingSeconds = Math.max(0, availableSeconds - currentMonthSeconds);
    const monthItems = Array.from(months.entries())
      .map(([monthKey, value]) => ({
        conversationCount: value.conversationCount,
        key: monthKey,
        label: getMonthLabel(monthKey),
        seconds: value.seconds,
      }))
      .sort((a, b) => b.key.localeCompare(a.key));
    const maxMonthSeconds = Math.max(...monthItems.map((item) => item.seconds), 1);

    return { availableSeconds, currentMonthSeconds, maxMonthSeconds, monthItems, remainingSeconds, totalConversationCount, totalSeconds, undatedSeconds };
  }, [carryoverMinutes, conversationItems, monthlyMinuteLimit]);
  const filteredConversationItems = useMemo(() => conversationItems.filter((conversation) => {
    const startedAt = conversation.startTimeUnix ? new Date(conversation.startTimeUnix * 1000) : null;
    const fromDate = conversationDateFrom ? new Date(`${conversationDateFrom}T00:00:00`) : null;
    const toDate = conversationDateTo ? new Date(`${conversationDateTo}T23:59:59`) : null;
    const minDuration = conversationMinDuration ? Number(conversationMinDuration) : null;
    const maxDuration = conversationMaxDuration ? Number(conversationMaxDuration) : null;

    if (fromDate && (!startedAt || startedAt < fromDate)) return false;
    if (toDate && (!startedAt || startedAt > toDate)) return false;
    if (minDuration !== null && (conversation.callDurationSecs === null || conversation.callDurationSecs < minDuration)) return false;
    if (maxDuration !== null && (conversation.callDurationSecs === null || conversation.callDurationSecs > maxDuration)) return false;

    return true;
  }), [conversationDateFrom, conversationDateTo, conversationItems, conversationMaxDuration, conversationMinDuration]);
  const conversationPageCount = Math.max(1, Math.ceil(filteredConversationItems.length / conversationsPerPage));
  const paginatedConversationItems = filteredConversationItems.slice((conversationPage - 1) * conversationsPerPage, conversationPage * conversationsPerPage);
  const selectedAgentKnowledgeDocument = agentKnowledgeDocuments.find((document) => document.id === selectedAgentKnowledgeDocumentId) ?? null;
  const canEditAgentKnowledge = canEditProject || !isAdminView;
  const activeAgentKnowledgeAction = canEditProject && adminSettings ? agentKnowledgeAction : customerAgentKnowledgeAction;
  const activeAgentKnowledgePending = canEditProject && adminSettings ? agentKnowledgePending : customerAgentKnowledgePending;
  const phoneDocumentStatus = phoneDocuments.length > 0
    ? "Portálon feltöltve"
    : project.phoneDocumentsReceived
      ? "E-mailben megkapva"
      : "Még nincs rögzítve";
  const onboardingOverview = getOnboardingOverview(project, phoneDocumentStatus);

  useEffect(() => {
    if (!selectedConversationId) return;
    if (filteredConversationItems.some((conversation) => conversation.conversationId === selectedConversationId)) return;
    setSelectedConversationId(null);
  }, [filteredConversationItems, selectedConversationId]);

  useEffect(() => {
    setConversationPage(1);
    setSelectedConversationId(null);
  }, [conversationDateFrom, conversationDateTo, conversationMaxDuration, conversationMinDuration]);

  useEffect(() => {
    if (conversationPage <= conversationPageCount) return;
    setConversationPage(conversationPageCount);
  }, [conversationPage, conversationPageCount]);

  return (
    <div className="detail-tabs">
      <div className="tabs-list" role="tablist" aria-label="Projekt részletei">
        {visibleTabs.map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={activeTab === tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            id={`${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
        {activeTab === "project-settings" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Projekt részletek</h2>
                <p>{isAdminView ? "Alapadatok, kategória és indítási dátumok admin kezelése." : "A projekt alapadatai. Ezeket jelenleg a norpheus AI csapata kezeli."}</p>
              </div>
              {adminSettings ? (
                <>
                  <div className="onboarding-overview">
                    <div className="onboarding-overview-header">
                      <div>
                        <span>Onboarding áttekintő</span>
                        <strong>Admin teendők egy nézetben</strong>
                      </div>
                      <span className={`onboarding-summary-badge ${onboardingOverview.summaryStatus}`}>
                        {onboardingOverview.summaryStatus === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {onboardingOverview.summary}
                      </span>
                    </div>
                    <div className="onboarding-check-grid">
                      {onboardingOverview.items.map((item) => (
                        <div className={`onboarding-check-card ${item.status}`} key={item.label}>
                          <span>{item.status === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  {canEditProject ? (
                    <form action={projectSettingsAction} className="voice-setup-form">
                      <input name="projectId" type="hidden" value={project.id} />
                      <input name="customerId" type="hidden" value={adminSettings.customerId} />
                      <input name="source" type="hidden" value={adminSettings.source} />
                      <input name="currentStatus" type="hidden" value={project.status} />
                      <div className="settings-form-grid">
                        <label className="field"><span>Projekt neve</span><input name="projectName" required defaultValue={project.name} /></label>
                        <label className="field"><span>Kategória</span><select name="category" defaultValue={project.category}>
                          <option value="voice_agent">{categoryLabels.voice_agent}</option>
                          <option value="chatbot">{categoryLabels.chatbot}</option>
                          <option value="automation">{categoryLabels.automation}</option>
                        </select></label>
                      </div>
                      <div className="settings-form-grid">
                        <label className="field date-field"><span>Tervezett indítás</span><div className="date-input-wrap"><CalendarClock size={16} /><input name="plannedLaunchDate" type="date" defaultValue={project.plannedLaunchDate ?? ""} /></div></label>
                        {project.status === "live" && <label className="field date-field"><span>Indítás ideje</span><div className="date-input-wrap"><CalendarClock size={16} /><input name="launchedAt" type="datetime-local" defaultValue={project.launchedAtInput ?? ""} /></div></label>}
                      </div>
                      {projectSettingsState.error && <p className="form-error">{projectSettingsState.error}</p>}
                      <div className="settings-actions">
                        <span className="save-note"><Settings2 size={15} /> Utolsó frissítés: {project.updatedAt}</span>
                        <button className="button" disabled={projectSettingsPending} type="submit">{projectSettingsPending ? "Mentés..." : "Projekt részletek mentése"} <Save size={15} /></button>
                      </div>
                    </form>
                  ) : (
                    <div className="project-readonly">
                      <div className="agent-scorecards project-scorecards">
                        <Scorecard className="project-scorecard wide" icon={FolderKanban} label="Projekt neve" value={project.name} />
                        <Scorecard className="project-scorecard" icon={Layers3} label="Kategória" value={categoryLabels[project.category]} />
                        <Scorecard className="project-scorecard" icon={CalendarClock} label="Tervezett indítás" value={project.plannedLaunchDate ?? "Nincs megadva"} />
                        {project.status === "live" && <Scorecard className="project-scorecard" icon={CalendarClock} label="Indítás ideje" value={project.launchedAt ?? "Nincs adat"} />}
                        <Scorecard className="project-scorecard" icon={Save} label="Utolsó frissítés" value={project.updatedAt} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="project-readonly">
                    <div className="agent-scorecards project-scorecards">
                      <Scorecard className="project-scorecard wide" icon={FolderKanban} label="Projekt neve" value={project.name} />
                      <Scorecard className="project-scorecard" icon={Layers3} label="Kategória" value={categoryLabels[project.category]} />
                      <Scorecard className="project-scorecard" icon={Phone} label="Telefonszám" value={project.phoneNumber ?? "Nincs még létrehozva telefonszám"} />
                      {project.status === "live" && (
                        <Scorecard className="project-scorecard" icon={CalendarClock} label="Indítás ideje" value={project.launchedAt ?? "Nincs megadva"} />
                      )}
                      <Scorecard className="project-scorecard" icon={Save} label="Utolsó frissítés" value={project.updatedAt} />
                    </div>
                  </div>
                  {project.status === "draft" ? (
                    <form action={reviewRequestAction} className="review-request-card">
                      <input name="projectId" type="hidden" value={project.id} />
                      <div>
                        <strong>Ellenőrzésre küldhető</strong>
                        <span>A leadás után a norpheus AI csapata ellenőrzi a beállításokat, és előkészíti a következő technikai lépéseket.</span>
                      </div>
                      <button className="button" disabled={reviewRequestPending} type="submit">
                        {reviewRequestPending ? "Küldés..." : "Ellenőrzésre küldés"}
                        <Save size={15} />
                      </button>
                      {reviewRequestState.error && <p className="form-error compact-form-error">{reviewRequestState.error}</p>}
                    </form>
                  ) : (
                    <div className="review-request-card passive">
                      <div>
                        <strong>Projekt leadva</strong>
                        <span>Az ellenőrzés folyamatban van.</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Voice agent alapbeállítások</h2>
                <p>Az itt megadott szövegek adják a telefonos asszisztens alap működését.</p>
              </div>
              {canEditProject ? (
                <>
                  <form action={setupAction} className="voice-setup-form">
                    <input name="projectId" type="hidden" value={project.id} />
                    <div className="settings-form-grid">
                      <label className="field"><span>Agent neve</span><input name="agentName" required defaultValue={project.agentDisplayName} /></label>
                    </div>
                    <label className="field"><span>Köszöntés</span><textarea name="greeting" defaultValue={project.greeting} placeholder="Pl. Jó napot kívánok, Anna vagyok, a telefonos asszisztens." /></label>
                    <label className="field"><span>Alap híváskezelési instrukciók</span><textarea name="callInstructions" defaultValue={project.callInstructions} placeholder="Írd le, milyen kérdésekre válaszolhat, hogyan vegyen fel adatokat, mikor ajánljon visszahívást." rows={6} /></label>
                    <label className="field"><span>Átadás / eszkaláció</span><textarea name="handoffInstructions" defaultValue={project.handoffInstructions} placeholder="Pl. sürgős ügy, panasz vagy bizonytalan válasz esetén kérjen visszahívási adatokat." rows={4} /></label>
                    {setupState.error && <p className="form-error">{setupState.error}</p>}
                    {setupState.success && <p className="form-success">{setupState.success}</p>}
                    <div className="settings-actions">
                      <span className="save-note"><Bot size={15} /> Utolsó frissítés: {project.updatedAt}</span>
                      <button className="button" disabled={setupPending} type="submit">{setupPending ? "Mentés..." : "Beállítások mentése"} <Save size={15} /></button>
                    </div>
                  </form>
                  {adminSettings && (
                    <div className="elevenlabs-inline-actions">
                      {project.elevenLabsAgentCreatedAt && (
                        <span className="save-note"><CalendarClock size={15} /> ElevenLabs agent létrehozva: {project.elevenLabsAgentCreatedAt}</span>
                      )}
                      {project.elevenLabsAgentError && <p className="form-error">{project.elevenLabsAgentError}</p>}
                      {elevenLabsState.error && <p className="form-error">{elevenLabsState.error}</p>}
                      <form action={elevenLabsIdAction} className="elevenlabs-id-form">
                        <input name="projectId" type="hidden" value={project.id} />
                        <input name="customerId" type="hidden" value={adminSettings.customerId} />
                        <input name="source" type="hidden" value={adminSettings.source} />
                        <label className="field">
                          <span>Meglévő ElevenLabs agent ID</span>
                          <input name="elevenLabsAgentId" defaultValue={project.elevenLabsAgentId ?? ""} placeholder="Pl. agent_..." />
                        </label>
                        {elevenLabsIdState.error && <p className="form-error">{elevenLabsIdState.error}</p>}
                        <div className="settings-actions compact-actions">
                          <span className="save-note"><KeyRound size={15} /> Ha az agent már ElevenLabs-ben létezik, itt kapcsold a projekthez.</span>
                          <button className="secondary-button" disabled={elevenLabsIdPending} type="submit">{elevenLabsIdPending ? "Mentés..." : "Meglévő ElevenLabs agent ID hozzáadása"} <Save size={15} /></button>
                        </div>
                      </form>
                      {!project.elevenLabsAgentId && (
                        <form action={elevenLabsAction} className="settings-actions compact-actions">
                          <input name="projectId" type="hidden" value={project.id} />
                          <input name="customerId" type="hidden" value={adminSettings.customerId} />
                          <input name="source" type="hidden" value={adminSettings.source} />
                          <span className="save-note"><Bot size={15} /> A gomb éles ElevenLabs agentet hoz létre.</span>
                          <button className="button" disabled={elevenLabsPending} type="submit">{elevenLabsPending ? "Létrehozás..." : "Agent létrehozása"} <Save size={15} /></button>
                        </form>
                      )}
                    </div>
                  )}
                  <form action={assetFlagsAction} className="asset-flag-form">
                    <input name="projectId" type="hidden" value={project.id} />
                    <input name="customerId" type="hidden" value={adminSettings?.customerId ?? ""} />
                    <input name="source" type="hidden" value={adminSettings?.source ?? ""} />
                    {project.knowledgeAssetsReceived && <input name="knowledgeAssetsReceived" type="hidden" value="on" />}
                    <label className="setting-option">
                      <div>
                        <strong>Minden prompt információ megvan</strong>
                        <p>Jelöld be, ha az agent promptjához szükséges minden adat külső fájlból vagy más csatornán már megérkezett.</p>
                      </div>
                      <span className="toggle"><input name="promptAssetsReceived" defaultChecked={project.promptAssetsReceived} type="checkbox" /><span /></span>
                    </label>
                    {assetFlagsState.error && <p className="form-error">{assetFlagsState.error}</p>}
                    <button className="secondary-button" disabled={assetFlagsPending} type="submit">{assetFlagsPending ? "Mentés..." : "Prompt állapot mentése"} <Save size={15} /></button>
                  </form>
                </>
              ) : (
                <div className="agent-readonly">
                  <div className="agent-scorecards">
                    <Scorecard icon={Bot} label="Agent neve" value={project.agentDisplayName} />
                    <Scorecard icon={Save} label="Utolsó frissítés" value={project.updatedAt} />
                  </div>
                  <div className="agent-text-card highlight">
                    <span><Bot size={15} /> Köszöntés</span>
                    <p>{project.greeting || "Nincs megadva"}</p>
                  </div>
                  <div className="agent-text-grid">
                    <ReadOnlyTextCard label="Alap híváskezelési instrukciók" value={project.callInstructions || "Nincs megadva"} />
                    <ReadOnlyTextCard label="Átadás / eszkaláció" value={project.handoffInstructions || "Nincs megadva"} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Tudásbázis</h2>
                <p>Kezeld a forrás dokumentumokat és az agenthez kapcsolt tudásbázis fájlokat.</p>
              </div>

              <div className="knowledge-tabs" role="tablist" aria-label="Tudásbázis nézetek">
                <button aria-selected={knowledgeTab === "agent-knowledge"} className={`tab-button ${knowledgeTab === "agent-knowledge" ? "active" : ""}`} onClick={() => setKnowledgeTab("agent-knowledge")} role="tab" type="button">Agent tudásbázis fájlok</button>
                <button aria-selected={knowledgeTab === "source-documents"} className={`tab-button ${knowledgeTab === "source-documents" ? "active" : ""}`} onClick={() => setKnowledgeTab("source-documents")} role="tab" type="button">Forrás dokumentumok</button>
              </div>

              {knowledgeTab === "source-documents" && (
                <>
                  <div className="overview-row"><span className="overview-label"><FileCheck2 size={15} /> Feldolgozva</span><span className="overview-value">{project.documentsReady} / {project.documents}</span></div>
                  <div className="progress-track"><div className="progress-bar" style={{ width: `${completion}%` }} /></div>
                  {canEditProject && adminSettings && (
                    <form action={assetFlagsAction} className="asset-flag-form">
                      <input name="projectId" type="hidden" value={project.id} />
                      <input name="customerId" type="hidden" value={adminSettings.customerId} />
                      <input name="source" type="hidden" value={adminSettings.source} />
                      {project.promptAssetsReceived && <input name="promptAssetsReceived" type="hidden" value="on" />}
                      <label className="setting-option">
                        <div>
                          <strong>Minden tudásbázis anyag megvan</strong>
                          <p>Jelöld be, ha a tudásbázishoz szükséges anyagokat külső fájlból vagy más csatornán már megkaptad.</p>
                        </div>
                        <span className="toggle"><input name="knowledgeAssetsReceived" defaultChecked={project.knowledgeAssetsReceived} type="checkbox" /><span /></span>
                      </label>
                      {assetFlagsState.error && <p className="form-error">{assetFlagsState.error}</p>}
                      <button className="secondary-button" disabled={assetFlagsPending} type="submit">{assetFlagsPending ? "Mentés..." : "Tudásbázis állapot mentése"} <Save size={15} /></button>
                    </form>
                  )}
                  {(!isAdminView || canEditProject) && (
                    <form action={uploadAction} className="knowledge-upload-form" ref={uploadFormRef}>
                      <input name="projectId" type="hidden" value={project.id} />
                      <label className="file-drop">
                        <Upload size={18} />
                        <span>Dokumentum kiválasztása</span>
                        <input accept=".pdf,.doc,.docx,.txt,.md,.csv" name="knowledgeFile" required type="file" />
                      </label>
                      {uploadState.error && <p className="form-error">{uploadState.error}</p>}
                      {uploadState.success && <p className="form-success">{uploadState.success}</p>}
                      <button className="button" disabled={uploadPending} type="submit">{uploadPending ? "Feltöltés..." : "Dokumentum feltöltése"} <Upload size={15} /></button>
                    </form>
                  )}
                  <div className="document-list">
                    {project.documentList.filter((document) => document.category === "knowledge_base").length ? project.documentList.filter((document) => document.category === "knowledge_base").map((document) => (
                      <div className="document-row" key={document.id}>
                        <div><strong>{document.fileName}</strong><span>{document.createdAt} · {formatFileSize(document.sizeBytes)}</span></div>
                        <DocumentStatusBadge status={document.processingStatus} />
                      </div>
                    )) : (
                      <DocumentEmptyNotice message="Még nincs feltöltött tudásbázis dokumentum." />
                    )}
                  </div>
                </>
              )}

              {knowledgeTab === "agent-knowledge" && (
                <div className="knowledge-source-section">
                  <div className="section-subheading">
                    <h3>Agent tudásbázis fájlok</h3>
                    <span>{elevenLabsKnowledgeBase?.documents.length ?? 0} fájl</span>
                  </div>
                  {elevenLabsKnowledgeBase?.error && <p className="form-error">Nem sikerült beolvasni az agent tudásbázist.</p>}
                  {agentKnowledgeState.error && <p className="form-error">{agentKnowledgeState.error}</p>}
                  {agentKnowledgeState.success && <p className="form-success">{agentKnowledgeState.success}</p>}
                  {customerAgentKnowledgeState.error && <p className="form-error">{customerAgentKnowledgeState.error}</p>}
                  {customerAgentKnowledgeState.success && <p className="form-success">{customerAgentKnowledgeState.success}</p>}
                  {agentKnowledgeDocuments.length ? (
                    <div className="agent-knowledge-workspace">
                      <div className="document-list agent-knowledge-file-list">
                        {agentKnowledgeDocuments.map((document) => (
                          <div className={`document-row agent-knowledge-file-row ${selectedAgentKnowledgeDocumentId === document.id ? "active" : ""}`} key={document.id}>
                            <div>
                              <strong>{document.name}</strong>
                              <span>
                                {[document.updatedAt ? `Frissítve: ${document.updatedAt}` : document.createdAt ? `Létrehozva: ${document.createdAt}` : null, document.sizeBytes ? formatFileSize(document.sizeBytes) : null, document.agentNames.length ? document.agentNames.join(", ") : null].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                            <div className="document-row-actions">
                              <span className="document-status ready"><FileText size={12} /> Agent tudásbázis</span>
                              {canEditAgentKnowledge && (
                                <button className="icon-button small" onClick={() => setSelectedAgentKnowledgeDocumentId(document.id)} title="Szerkesztés" type="button">
                                  <Pencil size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {canEditAgentKnowledge && selectedAgentKnowledgeDocument ? (
                        <form action={activeAgentKnowledgeAction} className="agent-knowledge-editor" id={`agent-knowledge-form-${selectedAgentKnowledgeDocument.id}`} key={selectedAgentKnowledgeDocument.id}>
                          <input name="projectId" type="hidden" value={project.id} />
                          {adminSettings && <input name="customerId" type="hidden" value={adminSettings.customerId} />}
                          {adminSettings && <input name="source" type="hidden" value={adminSettings.source} />}
                          <input name="documentationId" type="hidden" value={selectedAgentKnowledgeDocument.id} />
                          <label className="field">
                            <span>Fájl neve</span>
                            <input name="documentName" defaultValue={selectedAgentKnowledgeDocument.name} />
                          </label>
                          <RichTextEditor initialContent={selectedAgentKnowledgeDocument.content} inputName="documentContent" />
                          <div className="agent-knowledge-meta">
                            {[selectedAgentKnowledgeDocument.updatedAt ? `Frissítve: ${selectedAgentKnowledgeDocument.updatedAt}` : selectedAgentKnowledgeDocument.createdAt ? `Létrehozva: ${selectedAgentKnowledgeDocument.createdAt}` : null, selectedAgentKnowledgeDocument.sizeBytes ? formatFileSize(selectedAgentKnowledgeDocument.sizeBytes) : null].filter(Boolean).join(" · ")}
                          </div>
                          <div className="document-edit-warning">
                            <TriangleAlert size={16} />
                            <span>Téves adat megváltoztathatja az agent működését. Feltöltés előtt ellenőrizd a módosított tartalmat.</span>
                          </div>
                          <div className="settings-actions compact-actions">
                            <span className="save-note"><FileText size={15} /> Először mentsd a szerkesztést, utána töltsd fel az agentnek.</span>
                            <button className="button" disabled={activeAgentKnowledgePending} onClick={() => setAgentKnowledgeConfirmOpen(true)} type="button">{activeAgentKnowledgePending ? "Feltöltés..." : "Feltöltés agentnek"} <Upload size={15} /></button>
                          </div>
                          {agentKnowledgeConfirmOpen && (
                            <div className="modal-backdrop" role="presentation">
                              <div aria-labelledby="agent-knowledge-confirm-title" aria-modal="true" className="confirm-modal" role="dialog">
                                <div className="confirm-modal-icon"><TriangleAlert size={22} /></div>
                                <h3 id="agent-knowledge-confirm-title">Biztosan feltöltöd?</h3>
                                <p>A módosítás az agent tudásbázisába kerül. Téves adat megváltoztathatja az agent működését.</p>
                                <div className="confirm-modal-actions">
                                  <button className="secondary-button" onClick={() => setAgentKnowledgeConfirmOpen(false)} type="button">Mégsem</button>
                                  <button className="button" disabled={activeAgentKnowledgePending} type="submit">{activeAgentKnowledgePending ? "Feltöltés..." : "Igen, feltöltöm"} <Upload size={15} /></button>
                                </div>
                              </div>
                            </div>
                          )}
                        </form>
                      ) : (
                        <DocumentEmptyNotice message={canEditAgentKnowledge ? "Kattints a szerkesztés ikonra egy fájl módosításához." : "Válassz ki egy fájlt a megtekintéshez."} />
                      )}
                    </div>
                  ) : (
                    <DocumentEmptyNotice message={elevenLabsKnowledgeBase?.error ? "Nem sikerült beolvasni az agent tudásbázist." : "Nincs agent tudásbázis fájl ehhez a projekthez."} />
                  )}
                </div>
                )}
            </div>
          </div>
        )}

        {activeTab === "phone" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Telefonos kapcsolat</h2>
                <p>A létrehozott telefonszám és a Telnyx kapcsolat admin kezelése.</p>
              </div>
              {canEditProject && adminSettings && (
                <form action={phoneSettingsAction} className="voice-setup-form">
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="customerId" type="hidden" value={adminSettings.customerId} />
                  <input name="source" type="hidden" value={adminSettings.source} />
                  <div className="settings-form-grid">
                    <label className="field"><span>Telefonszám</span><input name="phoneNumber" defaultValue={project.phoneNumber ?? ""} placeholder="+36 21 123 4567" /></label>
                    <label className="field"><span>Telnyx státusz</span><select name="telnyxStatus" defaultValue={project.telnyxStatus}>
                      <option value="pending">{telnyxStatusLabels.pending}</option>
                      <option value="requested">{telnyxStatusLabels.requested}</option>
                      <option value="connected">{telnyxStatusLabels.connected}</option>
                      <option value="linked_to_voice_agent">{telnyxStatusLabels.linked_to_voice_agent}</option>
                      <option value="failed">{telnyxStatusLabels.failed}</option>
                    </select></label>
                  </div>
                  <label className="setting-option phone-document-toggle">
                    <div>
                      <strong>Dokumentumok feltöltve</strong>
                      <p>Jelöld be, ha a telefonszám igényléshez szükséges dokumentumokat e-mailben kaptad meg.</p>
                    </div>
                    <span className="toggle"><input name="phoneDocumentsReceived" defaultChecked={project.phoneDocumentsReceived} type="checkbox" /><span /></span>
                  </label>
                  {phoneSettingsState.error && <p className="form-error">{phoneSettingsState.error}</p>}
                  <div className="settings-actions">
                    <span className="save-note"><Phone size={15} /> Utolsó frissítés: {project.updatedAt}</span>
                    <button className="button" disabled={phoneSettingsPending} type="submit">{phoneSettingsPending ? "Mentés..." : "Telefonszám mentése"} <Save size={15} /></button>
                  </div>
                </form>
              )}

              {!canEditProject && (
                <div className="agent-scorecards project-scorecards admin-request-cards">
                  <Scorecard className="project-scorecard" icon={Phone} label="Telefonszám" value={project.phoneNumber ?? "Nincs rögzítve"} />
                  <Scorecard className="project-scorecard" icon={Settings2} label="Telnyx státusz" value={telnyxStatusLabels[project.telnyxStatus]} />
                  <Scorecard className="project-scorecard" icon={FileCheck2} label="Dokumentumok" value={project.phoneDocumentsReceived ? "E-mailben megkapva" : phoneDocuments.length > 0 ? "Portálon feltöltve" : "Nincs rögzítve"} />
                </div>
              )}

              {phoneDocuments.length > 0 && (
                <div className="document-list">
                  {phoneDocuments.map((document) => (
                  <div className="document-row" key={document.id}>
                    <div><strong>{phoneDocumentLabels[document.category as keyof typeof phoneDocumentLabels] ?? document.fileName}</strong><span>{document.fileName} · {document.createdAt} · {formatFileSize(document.sizeBytes)}</span></div>
                    <DocumentStatusBadge status={document.processingStatus} />
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "usage" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Felhasznált percek</h2>
                <p>A beszélgetések hossza alapján számolt havi és összesített használat.</p>
              </div>
              {conversations?.error && <p className="form-error">Nem sikerült beolvasni a perc felhasználást.</p>}
              {canEditProject && adminSettings && (
                <form action={minuteLimitsAction} className="usage-limit-form">
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="customerId" type="hidden" value={adminSettings.customerId} />
                  <div className="settings-form-grid">
                    <label className="field"><span>Havi keret</span><input min="0" name="monthlyMinuteLimit" type="number" defaultValue={monthlyMinuteLimit} /></label>
                    <label className="field"><span>Átvihető percek</span><input min="0" name="carryoverMinutes" type="number" defaultValue={carryoverMinutes} /></label>
                  </div>
                  {minuteLimitsState.error && <p className="form-error">{minuteLimitsState.error}</p>}
                  {minuteLimitsState.success && <p className="form-success">{minuteLimitsState.success}</p>}
                  <div className="settings-actions compact-actions">
                    <span className="save-note"><Clock3 size={15} /> Alapértelmezett keret: 1000 perc, átvihető: 50%.</span>
                    <button className="button" disabled={minuteLimitsPending} type="submit">{minuteLimitsPending ? "Mentés..." : "Keret mentése"} <Save size={15} /></button>
                  </div>
                </form>
              )}
              <div className="usage-summary-grid">
                <Scorecard icon={Clock3} label="Aktuális hónap" value={formatMinuteValue(usageSummary.currentMonthSeconds)} />
                <Scorecard icon={CalendarClock} label="Eddig összesen" value={formatMinuteValue(usageSummary.totalSeconds)} />
                <Scorecard icon={MessageSquareText} label="Mért beszélgetések" value={`${usageSummary.totalConversationCount}`} />
              </div>
              <div className="usage-summary-grid usage-quota-grid">
                <Scorecard icon={Clock3} label="Havi keret" value={`${monthlyMinuteLimit} perc`} />
                <Scorecard icon={CalendarClock} label="Átvihető percek" value={`${carryoverMinutes} perc`} />
                <Scorecard icon={CheckCircle2} label="Elérhető maradék" value={usageSummary.availableSeconds > 0 ? formatMinuteValue(usageSummary.remainingSeconds) : "Nincs keret"} />
              </div>

              <div className="usage-section">
                <div className="section-subheading">
                  <h3>Havi bontás</h3>
                  <span>{usageSummary.monthItems.length} hónap</span>
                </div>
                <div className="usage-chart" aria-label="Havi perc felhasználás">
                  {usageSummary.monthItems.map((item) => (
                    <div className="usage-chart-row" key={item.key}>
                      <span>{item.label}</span>
                      <div className="usage-bar-track">
                        <div className="usage-bar" style={{ width: `${Math.max(3, (item.seconds / usageSummary.maxMonthSeconds) * 100)}%` }} />
                      </div>
                      <strong>{formatMinuteValue(item.seconds)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="usage-section">
                <div className="section-subheading">
                  <h3>Lista</h3>
                  <span>Beszélgetéshossz alapján</span>
                </div>
                <div className="usage-list">
                  {usageSummary.monthItems.map((item) => (
                    <div className="usage-list-row" key={item.key}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.conversationCount} beszélgetés</span>
                      </div>
                      <span>{formatMinuteValue(item.seconds)}</span>
                    </div>
                  ))}
                  {usageSummary.undatedSeconds > 0 && (
                    <div className="usage-list-row muted-row">
                      <div>
                        <strong>Dátum nélküli beszélgetések</strong>
                        <span>Az API nem adott kezdési időt</span>
                      </div>
                      <span>{formatMinuteValue(usageSummary.undatedSeconds)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Aktivitás</h2>
                <p>Beszélgetések, leiratok és hangfelvételek egy helyen.</p>
              </div>
              {conversations?.error && <p className="form-error">Nem sikerült beolvasni a beszélgetéseket.</p>}
              {deleteConversationState.error && <p className="form-error">Nem sikerült törölni a beszélgetést: {deleteConversationState.error}</p>}
              {conversationItems.length ? (
                <>
                  <div className="conversation-filters" aria-label="Beszélgetés szűrők">
                    <DateFilterPicker label="Dátumtól" value={conversationDateFrom} onChange={setConversationDateFrom} />
                    <DateFilterPicker label="Dátumig" value={conversationDateTo} onChange={setConversationDateTo} />
                    <label className="conversation-filter-field">
                      <span>Min. hossz</span>
                      <input min="0" placeholder="mp" type="number" value={conversationMinDuration} onChange={(event) => setConversationMinDuration(event.target.value)} />
                    </label>
                    <label className="conversation-filter-field">
                      <span>Max. hossz</span>
                      <input min="0" placeholder="mp" type="number" value={conversationMaxDuration} onChange={(event) => setConversationMaxDuration(event.target.value)} />
                    </label>
                    <button
                      className="secondary-button compact-filter-reset"
                      onClick={() => {
                        setConversationDateFrom("");
                        setConversationDateTo("");
                        setConversationMinDuration("");
                        setConversationMaxDuration("");
                      }}
                      type="button"
                    >
                      Szűrők törlése
                    </button>
                  </div>

                  <div className="conversation-layout">
                    <div className="conversation-list compact">
                      {filteredConversationItems.length ? paginatedConversationItems.map((conversation) => (
                        <div className={`conversation-accordion-item ${selectedConversationId === conversation.conversationId ? "active" : ""}`} key={conversation.conversationId}>
                          <button
                            aria-expanded={selectedConversationId === conversation.conversationId}
                            className="conversation-list-row"
                            onClick={() => setSelectedConversationId((currentId) => currentId === conversation.conversationId ? null : conversation.conversationId)}
                            type="button"
                          >
                            <div>
                              <strong>{conversation.callSummaryTitle || "Beszélgetés"}</strong>
                              <span><Clock3 size={14} /> {conversation.startTime ?? "Nincs dátum"}</span>
                            </div>
                            <span className="conversation-row-meta">{formatDuration(conversation.callDurationSecs)}</span>
                            <span className={`conversation-status ${conversation.status}`}>{conversation.status}</span>
                          </button>
                          {selectedConversationId === conversation.conversationId && (
                            <div className="conversation-card conversation-detail-card">
                              {canEditProject && adminSettings && (
                                <div className="conversation-detail-actions">
                                  <form
                                    action={deleteConversationAction}
                                    onSubmit={(event) => {
                                      if (!window.confirm(`Biztosan törlöd ezt a beszélgetést?\n\n${conversation.callSummaryTitle || "Beszélgetés"}\n${conversation.startTime ?? ""}`)) {
                                        event.preventDefault();
                                      }
                                    }}
                                  >
                                    <input name="conversationId" type="hidden" value={conversation.conversationId} />
                                    <input name="customerId" type="hidden" value={adminSettings.customerId} />
                                    <input name="projectId" type="hidden" value={project.id} />
                                    <input name="source" type="hidden" value={adminSettings.source} />
                                    <button className="danger-button compact-danger-button" disabled={deleteConversationPending} type="submit">
                                      <Trash2 size={15} />
                                      {deleteConversationPending ? "Törlés..." : "Beszélgetés törlése"}
                                    </button>
                                  </form>
                                </div>
                              )}
                              {conversation.transcriptSummary && <p className="conversation-summary">{conversation.transcriptSummary}</p>}
                              {conversation.audioUrl ? (
                                <div className="conversation-audio">
                                  <span><PlayCircle size={15} /> Hangfelvétel</span>
                                  <audio controls preload="none" src={conversation.audioUrl} />
                                </div>
                              ) : (
                                <p className="empty-note"><PlayCircle size={16} /> Ehhez a beszélgetéshez nincs hangfelvétel.</p>
                              )}
                              <div className="conversation-transcript">
                                <div className="section-subheading">
                                  <h3>Leirat</h3>
                                  <span>{conversation.transcript.length} sor</span>
                                </div>
                                {conversation.transcript.length ? conversation.transcript.map((item, index) => (
                                  <div className={`transcript-row ${item.role}`} key={`${conversation.conversationId}-${index}`}>
                                    <span>{item.role === "agent" ? "Agent" : item.role === "user" ? "Ügyfél" : item.role}</span>
                                    <p>{item.message || "Nincs szöveg"}</p>
                                    {item.timeInCallSecs !== null && <small>{item.timeInCallSecs} mp</small>}
                                  </div>
                                )) : (
                                  <DocumentEmptyNotice message="Ehhez a beszélgetéshez még nincs leirat." />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )) : (
                        <p className="empty-note"><MessageSquareText size={16} /> Nincs találat a szűrők alapján.</p>
                      )}
                    </div>
                    {filteredConversationItems.length > conversationsPerPage && (
                      <div className="conversation-pagination">
                        <span>
                          {(conversationPage - 1) * conversationsPerPage + 1}-{Math.min(conversationPage * conversationsPerPage, filteredConversationItems.length)} / {filteredConversationItems.length}
                        </span>
                        <div>
                          <button className="secondary-button" disabled={conversationPage === 1} onClick={() => setConversationPage((page) => Math.max(1, page - 1))} type="button">Előző</button>
                          <button className="secondary-button" disabled={conversationPage === conversationPageCount} onClick={() => setConversationPage((page) => Math.min(conversationPageCount, page + 1))} type="button">Következő</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-note"><MessageSquareText size={16} /> Még nincs megjeleníthető beszélgetés ehhez az agenthez.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "live-agent" && !isAdminView && (
          <div className="tab-content">
            <div className="tab-card live-agent-tab-card">
              <div className="tab-heading live-agent-heading">
                <h2>Próbáld ki az agentet élőben</h2>
                <p>Itt tudod tesztelni, hogyan válaszol a voice agent a valós beszélgetésekben.</p>
              </div>
              <div className="live-agent-widget-wrap">
                <ElevenLabsAgentWidget agentId={project.elevenLabsAgentId} inline />
              </div>
            </div>
          </div>
        )}

        {activeTab === "google-access" && adminSettings && (
          <div className="tab-content">
            <div className="tab-card">
              <div className="tab-heading">
                <h2>Google hozzáférés</h2>
                <p>Az ügyfél onboardingban beküldött technikai Google fiók és biztonságos jelszómegosztó link admin kezelése.</p>
              </div>
              <div className="agent-scorecards project-scorecards admin-request-cards">
                <Scorecard className="project-scorecard" icon={Mail} label="Google fiók" value={project.googleAccountEmail ?? "Nincs megadva"} />
                <Scorecard className="project-scorecard" icon={KeyRound} label="Státusz" value={googleAccessStatusLabels[project.googleAccessStatus]} />
                <Scorecard className="project-scorecard" icon={CheckCircle2} label="Megadás" value={project.googleAccessRequired ? "Kötelező" : "Nem kötelező"} />
                <Scorecard className="project-scorecard wide" icon={LinkIcon} label="Jelszómegosztó link" value={project.googlePasswordShareUrl ? "Beküldve" : "Nincs megadva"} />
              </div>
              {project.googlePasswordShareUrl && (
                <a className="secondary-button inline-action-link" href={project.googlePasswordShareUrl} rel="noreferrer" target="_blank">
                  Link megnyitása <ExternalLink size={15} />
                </a>
              )}
              {canEditProject && (
                <form action={googleAccessAction} className="voice-setup-form">
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="customerId" type="hidden" value={adminSettings.customerId} />
                  <input name="source" type="hidden" value={adminSettings.source} />
                  <div className="settings-form-grid">
                    <label className="field"><span>Google technikai fiók e-mail címe</span><input name="googleAccountEmail" defaultValue={project.googleAccountEmail ?? ""} placeholder="asszisztens@cegnev.hu" type="email" /></label>
                    <label className="field"><span>Google hozzáférés státusz</span><select name="googleAccessStatus" defaultValue={project.googleAccessStatus}>
                      <option value="not_provided">{googleAccessStatusLabels.not_provided}</option>
                      <option value="submitted">{googleAccessStatusLabels.submitted}</option>
                      <option value="checking">{googleAccessStatusLabels.checking}</option>
                      <option value="working">{googleAccessStatusLabels.working}</option>
                      <option value="failed">{googleAccessStatusLabels.failed}</option>
                    </select></label>
                  </div>
                  <label className="field"><span>Biztonságos jelszómegosztó link</span><input name="googlePasswordShareUrl" defaultValue={project.googlePasswordShareUrl ?? ""} placeholder="https://..." type="url" /></label>
                  <label className="setting-option">
                    <div>
                      <strong>Google hozzáférés kötelező</strong>
                      <p>Kapcsold ki, ha ennél a projektnél nincs szükség technikai Google fiókra.</p>
                    </div>
                    <span className="toggle"><input name="googleAccessRequired" defaultChecked={project.googleAccessRequired} type="checkbox" /><span /></span>
                  </label>
                  {googleAccessState.error && <p className="form-error">{googleAccessState.error}</p>}
                  <div className="settings-actions">
                    <span className="save-note"><KeyRound size={15} /> Utolsó frissítés: {project.updatedAt}</span>
                    <button className="button" disabled={googleAccessPending} type="submit">{googleAccessPending ? "Mentés..." : "Google hozzáférés mentése"} <Save size={15} /></button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Scorecard({ className = "", icon: Icon, label, value }: { className?: string; icon: LucideIcon; label: string; value: string }) {
  return (
    <div className={`agent-scorecard ${className}`}>
      <span><Icon size={15} /> {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReadOnlyTextCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="agent-text-card">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: DocumentProcessingStatus }) {
  const needsAttention = status === "uploaded" || status === "processing";

  return (
    <span className={`document-status ${status}`}>
      {needsAttention && <BellRing size={12} />}
      {documentStatusLabels[status]}
    </span>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toEditorHtml(value: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function RichTextEditor({ initialContent, inputName }: { initialContent: string; inputName: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialHtml = useMemo(() => toEditorHtml(initialContent), [initialContent]);
  const [content, setContent] = useState(initialHtml);
  const [saved, setSaved] = useState(true);

  const syncContent = () => {
    const nextContent = editorRef.current?.innerHTML ?? "";
    setContent(nextContent);
    setSaved(false);
  };

  const format = (command: "bold" | "insertOrderedList" | "insertUnorderedList" | "italic") => {
    window.document.execCommand(command);
    syncContent();
    editorRef.current?.focus();
  };

  return (
    <div className="rich-editor-field">
      <div className="rich-editor-label-row">
        <span>Tartalom</span>
        <span>{saved ? "Szerkesztés mentve" : "Mentetlen módosítás"}</span>
      </div>
      <div className="rich-editor-toolbar" aria-label="Szerkesztő eszközök">
        <button onClick={() => format("bold")} type="button">B</button>
        <button onClick={() => format("italic")} type="button">I</button>
        <button onClick={() => format("insertUnorderedList")} type="button">Lista</button>
        <button onClick={() => format("insertOrderedList")} type="button">Számozás</button>
      </div>
      <div
        className="rich-editor-surface"
        contentEditable
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={syncContent}
        ref={editorRef}
        suppressContentEditableWarning
      />
      <input name={inputName} readOnly type="hidden" value={content} />
      <button className="secondary-button rich-editor-save" onClick={() => {
        syncContent();
        setSaved(true);
      }} type="button">Mentés</button>
    </div>
  );
}

function DocumentEmptyNotice({ message }: { message: string }) {
  return (
    <div className="document-empty-warning">
      <BellRing size={15} />
      <span>{message}</span>
    </div>
  );
}

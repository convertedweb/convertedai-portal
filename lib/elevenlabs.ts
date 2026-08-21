type CreateElevenLabsAgentInput = {
  agentName: string;
  companyName: string;
  greeting: string;
  instructions: string;
  projectId: string;
  projectName: string;
};

type ElevenLabsCreateAgentResponse = {
  agent_id?: string;
};

export type ElevenLabsKnowledgeBaseDocument = {
  agentNames: string[];
  content: string;
  createdAt: string | null;
  id: string;
  name: string;
  sizeBytes: number | null;
  type: string;
  updatedAt: string | null;
  url: string | null;
};

type ElevenLabsKnowledgeBaseApiDocument = {
  dependent_agents?: {
    id?: string;
    name?: string;
  }[];
  id?: string;
  metadata?: {
    created_at_unix_secs?: number;
    last_updated_at_unix_secs?: number;
    size_bytes?: number;
  };
  name?: string;
  type?: string;
  url?: string;
};

type ElevenLabsKnowledgeBaseResponse = {
  documents?: ElevenLabsKnowledgeBaseApiDocument[];
};

export type ElevenLabsConversationTranscriptItem = {
  message: string;
  role: string;
  timeInCallSecs: number | null;
};

export type ElevenLabsConversation = {
  audioUrl: string | null;
  callDurationSecs: number | null;
  callSummaryTitle: string | null;
  callSuccessful: string | null;
  conversationId: string;
  hasAudio: boolean;
  messageCount: number | null;
  startTime: string | null;
  startTimeUnix: number | null;
  status: string;
  transcript: ElevenLabsConversationTranscriptItem[];
  transcriptSummary: string | null;
};

type ElevenLabsConversationListItem = {
  agent_id?: string;
  call_duration_secs?: number;
  call_successful?: string;
  call_summary_title?: string;
  conversation_id?: string;
  has_audio?: boolean;
  message_count?: number;
  start_time_unix_secs?: number;
  status?: string;
  transcript_summary?: string;
};

type ElevenLabsConversationsResponse = {
  conversations?: ElevenLabsConversationListItem[];
};

type ElevenLabsConversationDetailsResponse = {
  conversation_id?: string;
  has_audio?: boolean;
  transcript?: {
    message?: string;
    role?: string;
    time_in_call_secs?: number;
  }[];
};

function getElevenLabsApiKey() {
  return process.env.ELEVENLABS_API_KEY ?? process.env.XI_API_KEY ?? "";
}

function formatUnixDate(seconds?: number) {
  if (!seconds) return null;
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "long" }).format(new Date(seconds * 1000));
}

function formatUnixDateTime(seconds?: number) {
  if (!seconds) return null;
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(seconds * 1000));
}

function buildSystemPrompt(input: CreateElevenLabsAgentInput) {
  const baseInstructions = input.instructions.trim() || "Kezeld udvariasan a bejövő telefonhívásokat, rögzítsd a fontos adatokat, és bizonytalan helyzetben kérj visszahívási elérhetőséget.";

  return [
    `Te ${input.agentName} vagy, a(z) ${input.companyName} telefonos AI asszisztense.`,
    "Beszélj magyarul, természetes, udvarias és tömör stílusban.",
    "Ne találj ki nem ismert információt. Ha valamiben nem vagy biztos, kérj elérhetőséget és jelezd, hogy munkatárs visszahívja az ügyfelet.",
    "",
    "Alap híváskezelési instrukciók:",
    baseInstructions,
  ].join("\n");
}

export async function createElevenLabsAgent(input: CreateElevenLabsAgentInput) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    body: JSON.stringify({
      conversation_config: {
        agent: {
          first_message: input.greeting.trim() || `Jó napot kívánok, ${input.agentName} vagyok. Miben segíthetek?`,
          prompt: {
            prompt: buildSystemPrompt(input),
          },
        },
      },
      name: input.projectName,
      tags: ["norpheus-ai", input.projectId],
    }),
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    method: "POST",
  });

  const responseText = await response.text();
  let payload: ElevenLabsCreateAgentResponse | null = null;

  try {
    payload = responseText ? JSON.parse(responseText) as ElevenLabsCreateAgentResponse : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.agent_id) {
    return {
      error: `ElevenLabs agent létrehozás sikertelen: ${response.status} ${response.statusText}`,
      rawError: responseText.slice(0, 500),
    };
  }

  return { agentId: payload.agent_id };
}

export async function listElevenLabsKnowledgeBaseDocuments(agentId?: string | null) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { documents: [], error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  if (!agentId) {
    return { documents: [], error: null };
  }

  const url = new URL("https://api.elevenlabs.io/v1/convai/knowledge-base");
  url.searchParams.set("page_size", "100");
  url.searchParams.set("sort_by", "updated_at");
  url.searchParams.set("sort_direction", "desc");
  url.searchParams.set("types", "file");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  const responseText = await response.text();
  let payload: ElevenLabsKnowledgeBaseResponse | null = null;

  try {
    payload = responseText ? JSON.parse(responseText) as ElevenLabsKnowledgeBaseResponse : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      documents: [],
      error: `ElevenLabs tudásbázis beolvasás sikertelen: ${response.status} ${response.statusText}`,
    };
  }

  const documents = await Promise.all((payload?.documents ?? [])
    .filter((document) => document.id && document.name)
    .filter((document) => (document.dependent_agents ?? []).some((agent) => agent.id === agentId))
    .map(async (document) => {
      const id = document.id as string;
      const content = await getElevenLabsKnowledgeBaseDocumentContent(id);

      return {
        agentNames: (document.dependent_agents ?? []).map((agent) => agent.name).filter(Boolean) as string[],
        content: content.content ?? "",
        createdAt: formatUnixDate(document.metadata?.created_at_unix_secs),
        id,
        name: document.name as string,
        sizeBytes: document.metadata?.size_bytes ?? null,
        type: document.type ?? "file",
        updatedAt: formatUnixDate(document.metadata?.last_updated_at_unix_secs),
        url: document.url ?? null,
      };
    }));

  return { documents, error: null };
}

export async function getElevenLabsKnowledgeBaseDocumentContent(documentationId: string) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { content: null, error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${documentationId}/content`, {
    cache: "no-store",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  const content = await response.text();

  if (!response.ok) {
    return {
      content: null,
      error: `Agent tudásbázis tartalom beolvasás sikertelen: ${response.status} ${response.statusText}`,
    };
  }

  return { content, error: null };
}

export async function updateElevenLabsKnowledgeBaseDocument(input: { content: string; documentationId: string; name: string }) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${input.documentationId}`, {
    body: JSON.stringify({
      content: input.content,
      name: input.name,
    }),
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    method: "PATCH",
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      error: `Agent tudásbázis feltöltés sikertelen: ${response.status} ${response.statusText}`,
      rawError: responseText.slice(0, 500),
    };
  }

  return { error: null };
}

export async function listElevenLabsConversations(agentId?: string | null, projectId?: string | null) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { conversations: [], error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  if (!agentId || !projectId) {
    return { conversations: [], error: null };
  }

  const url = new URL("https://api.elevenlabs.io/v1/convai/conversations");
  url.searchParams.set("agent_id", agentId);
  url.searchParams.set("page_size", "20");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  const responseText = await response.text();
  let payload: ElevenLabsConversationsResponse | null = null;

  try {
    payload = responseText ? JSON.parse(responseText) as ElevenLabsConversationsResponse : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      conversations: [],
      error: `Beszélgetések beolvasása sikertelen: ${response.status} ${response.statusText}`,
    };
  }

  const conversations = await Promise.all((payload?.conversations ?? [])
    .filter((conversation) => conversation.conversation_id)
    .map(async (conversation) => {
      const conversationId = conversation.conversation_id as string;
      const details = await getElevenLabsConversationDetails(conversationId);
      const hasAudio = Boolean(details.conversation?.hasAudio ?? conversation.has_audio);

      return {
        audioUrl: hasAudio ? `/api/agent-conversations/${conversationId}/audio?projectId=${encodeURIComponent(projectId)}` : null,
        callDurationSecs: conversation.call_duration_secs ?? null,
        callSummaryTitle: conversation.call_summary_title ?? null,
        callSuccessful: conversation.call_successful ?? null,
        conversationId,
        hasAudio,
        messageCount: conversation.message_count ?? null,
        startTime: formatUnixDateTime(conversation.start_time_unix_secs),
        startTimeUnix: conversation.start_time_unix_secs ?? null,
        status: conversation.status ?? "unknown",
        transcript: details.conversation?.transcript ?? [],
        transcriptSummary: conversation.transcript_summary ?? null,
      };
    }));

  return { conversations, error: null };
}

export async function getElevenLabsConversationDetails(conversationId: string) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { conversation: null, error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    cache: "no-store",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  const responseText = await response.text();
  let payload: ElevenLabsConversationDetailsResponse | null = null;

  try {
    payload = responseText ? JSON.parse(responseText) as ElevenLabsConversationDetailsResponse : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload) {
    return {
      conversation: null,
      error: `Beszélgetés részleteinek beolvasása sikertelen: ${response.status} ${response.statusText}`,
    };
  }

  return {
    conversation: {
      conversationId: payload.conversation_id ?? conversationId,
      hasAudio: Boolean(payload.has_audio),
      transcript: (payload.transcript ?? []).map((item) => ({
        message: item.message ?? "",
        role: item.role ?? "unknown",
        timeInCallSecs: item.time_in_call_secs ?? null,
      })),
    },
    error: null,
  };
}

export async function getElevenLabsConversationAudio(conversationId: string) {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    return { audio: null, contentType: null, error: "Hiányzik az ELEVENLABS_API_KEY környezeti változó." };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`, {
    cache: "no-store",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    return {
      audio: null,
      contentType: null,
      error: `Hangfájl beolvasása sikertelen: ${response.status} ${response.statusText}`,
    };
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    error: null,
  };
}

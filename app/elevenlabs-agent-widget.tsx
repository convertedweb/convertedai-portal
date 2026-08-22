"use client";

import Script from "next/script";
import { createElement } from "react";

export function ElevenLabsAgentWidget({ agentId, inline = false }: { agentId: string | null; inline?: boolean }) {
  if (!agentId) return null;

  return (
    <div className={`elevenlabs-widget ${inline ? "inline" : ""}`}>
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" />
      {createElement("elevenlabs-convai", {
        "agent-id": agentId,
        "action-text": "Élő agent",
        "start-call-text": "Beszélgetés indítása",
        "end-call-text": "Beszélgetés befejezése",
        "expand-text": "Élő agent megnyitása",
        ...(inline ? { dismissible: "false", variant: "full" } : {}),
      })}
    </div>
  );
}

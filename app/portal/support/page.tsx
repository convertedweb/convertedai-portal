import { MessageSquarePlus } from "lucide-react";
import { getPortalSupportTickets, supportStatusLabels, supportTopicLabels } from "@/lib/support";
import { SupportReplyForm } from "./support-reply-form";
import { SupportTicketForm } from "./support-ticket-form";

export default async function PortalSupportPage() {
  const { projects, tickets } = await getPortalSupportTickets();

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Támogatás</p>
          <h1>Üzenetek</h1>
          <p className="intro-copy">Kérdés, módosítás vagy hiba esetén itt tudsz üzenetet küldeni a norpheus AI csapatának.</p>
        </div>
      </div>

      <div className="tab-card support-create-card">
        <div className="tab-heading">
          <h2>Új üzenet</h2>
          <p>Válassz témát, és írd le, miben segíthetünk.</p>
        </div>
        <SupportTicketForm projects={projects} />
      </div>

      <div className="support-section">
        <div className="section-heading-row">
          <h2>Korábbi üzenetek</h2>
          <span>{tickets.length} üzenet</span>
        </div>
        {tickets.length ? (
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
              <details className="support-ticket-thread" key={ticket.id}>
                <summary className="support-ticket-row">
                  <div className="support-ticket-icon"><MessageSquarePlus size={18} /></div>
                  <div>
                    <strong>{ticket.subject}</strong>
                    <span>{supportTopicLabels[ticket.topic]}{ticket.projectName ? ` · ${ticket.projectName}` : ""}</span>
                    <p>{ticket.messagePreview}</p>
                  </div>
                  <div className="support-ticket-meta">
                    <span className={`support-status ${ticket.status}`}>{supportStatusLabels[ticket.status]}</span>
                    <small>{ticket.updatedAt}</small>
                  </div>
                </summary>
                <div className="support-thread-body">
                  <div className="support-message-list">
                    {ticket.messages.map((message) => (
                      <div className={`support-message ${message.authorRole}`} key={message.id}>
                        <div>
                          <strong>{message.authorRole === "admin" ? "norpheus AI" : "Ügyfél"}</strong>
                          <span>{message.createdAt}</span>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    ))}
                  </div>
                  <SupportReplyForm disabled={ticket.status === "closed"} ticketId={ticket.id} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="empty-note"><MessageSquarePlus size={16} /> Még nincs támogatási üzenet.</p>
        )}
      </div>
    </section>
  );
}

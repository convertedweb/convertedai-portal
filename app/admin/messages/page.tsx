import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { getAdminSupportTickets, supportPriorityLabels, supportStatusLabels, supportTopicLabels } from "@/lib/support";
import { DeleteSupportTicketButton } from "./delete-support-ticket-button";
import { AdminSupportReplyForm } from "./support-reply-form";
import { SupportStatusForm } from "./support-status-form";

export default async function AdminMessagesPage() {
  const { canDelete, canView, tickets, userEmail } = await getAdminSupportTickets();

  if (!canView) {
    return (
      <section className="content">
        <div className="access-denied">
          <div className="access-denied-icon"><MessageSquareText size={28} /></div>
          <h1>Nincs admin hozzáférés</h1>
          <p>Az üzenetek kezeléséhez admin jogosultság szükséges. Most ezzel a fiókkal vagy belépve: <strong>{userEmail ?? "ismeretlen email"}</strong>.</p>
          <div className="access-denied-actions">
            <Link className="button" href="/auth/signout?next=/admin/messages">Kijelentkezés</Link>
            <Link className="secondary-button" href="/login?next=/admin/messages">Másik fiókkal belépek</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Üzenetek</h1>
          <p className="intro-copy">Ügyféloldalról érkező támogatási üzenetek és kérések.</p>
        </div>
        <span className="count-label">{tickets.length} üzenet</span>
      </div>

      {tickets.length ? (
        <div className="support-ticket-list admin-support-ticket-list">
          {tickets.map((ticket) => (
            <details className="support-ticket-thread" key={ticket.id}>
              <summary className="support-ticket-row admin-support-ticket-row">
                <div className="support-ticket-icon"><MessageSquareText size={18} /></div>
                <div>
                  <strong>{ticket.subject}</strong>
                  <span>{ticket.customerName} · {supportTopicLabels[ticket.topic]}{ticket.projectName ? ` · ${ticket.projectName}` : ""}</span>
                  <p>{ticket.messagePreview}</p>
                </div>
                <div className="support-ticket-meta">
                  <span className={`support-status ${ticket.status}`}>{supportStatusLabels[ticket.status]}</span>
                  <small>{supportPriorityLabels[ticket.priority]} · {ticket.updatedAt}</small>
                </div>
                <SupportStatusForm status={ticket.status} ticketId={ticket.id} />
              </summary>
              <div className="support-thread-body">
                <div className="support-message-list">
                  {ticket.messages.map((message) => (
                    <div className={`support-message ${message.authorRole}`} key={message.id}>
                      <div>
                        <strong>{message.authorRole === "admin" ? "Admin" : "Ügyfél"}</strong>
                        <span>{message.createdAt}</span>
                      </div>
                      <p>{message.message}</p>
                    </div>
                  ))}
                </div>
                <AdminSupportReplyForm ticketId={ticket.id} />
                {canDelete && <DeleteSupportTicketButton subject={ticket.subject} ticketId={ticket.id} />}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="empty-note"><MessageSquareText size={16} /> Még nincs ügyfélüzenet.</p>
      )}
    </section>
  );
}

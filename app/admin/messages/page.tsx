import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { getAdminSupportTickets, supportPriorityLabels, supportStatusLabels, supportTopicLabels } from "@/lib/support";
import { SupportStatusForm } from "./support-status-form";

export default async function AdminMessagesPage() {
  const { canView, tickets, userEmail } = await getAdminSupportTickets();

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
            <div className="support-ticket-row admin-support-ticket-row" key={ticket.id}>
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
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note"><MessageSquareText size={16} /> Még nincs ügyfélüzenet.</p>
      )}
    </section>
  );
}

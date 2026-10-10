import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TaskDetail } from "./task-detail";

export default async function AdminTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section className="content">
      <Link className="back-link" href="/admin/tasks"><ArrowLeft size={15} /> Vissza a projektmenedzserhez</Link>
      <div className="task-detail-page"><TaskDetail id={id} /></div>
    </section>
  );
}

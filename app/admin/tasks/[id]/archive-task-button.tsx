"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateTaskStatus } from "../actions";

export function ArchiveTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="secondary-button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const formData = new FormData();
        formData.set("taskId", taskId);
        formData.set("status", "archived");
        await updateTaskStatus(formData);
        router.push("/admin/tasks");
      })}
      type="button"
    >
      <Archive size={15} />
      {pending ? "Archiválás..." : "Archiválás"}
    </button>
  );
}

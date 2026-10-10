import { TaskDetail } from "../../[id]/task-detail";
import { TaskDrawer } from "../../[id]/task-drawer";

export default async function TaskDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskDrawer><TaskDetail id={id} /></TaskDrawer>;
}

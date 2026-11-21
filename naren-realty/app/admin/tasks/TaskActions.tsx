import { updatePendingTask } from "./actions";

export default function TaskActions({ taskId }: { taskId: string }) {
  return <div className="flex flex-wrap gap-2">
    <form action={updatePendingTask}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value="completed" />
      <button type="submit" className="rounded-lg bg-[#10243A] px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Mark completed</button>
    </form>
    <form action={updatePendingTask}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value="dismissed" />
      <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Dismiss</button>
    </form>
  </div>;
}

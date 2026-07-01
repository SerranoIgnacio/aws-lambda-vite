import type { Task, TaskStatus } from "../types/task";
import StatusBadge from "./StatusBadge";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "done", label: "Completada" },
];

export default function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onDelete,
}: TaskCardProps) {
  function handleDelete() {
    if (window.confirm(`¿Eliminar la tarea "${task.title}"?`)) {
      onDelete(task.id);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="text-left font-medium text-gray-900 hover:text-indigo-600"
        >
          {task.title}
        </button>
        <StatusBadge status={task.status} />
      </div>
      {task.description && (
        <p className="line-clamp-3 text-sm text-gray-600">{task.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs font-medium text-red-600 hover:text-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

import type { Task, TaskStatus } from "../types/task";
import TaskCard from "./TaskCard";

export type TaskFilter = "all" | TaskStatus;

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "done", label: "Completada" },
];

function Skeleton() {
  return (
    <div className="h-36 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
  );
}

export default function TaskList({
  tasks,
  loading,
  error,
  filter,
  onFilterChange,
  onEdit,
  onStatusChange,
  onDelete,
}: TaskListProps) {
  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              filter === f.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
          No hay tareas para mostrar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

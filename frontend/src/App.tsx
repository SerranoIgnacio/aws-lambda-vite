import { useEffect, useReducer, useState } from "react";
import { createTask, deleteTask, listTasks, updateTask } from "./api/tasks";
import TaskForm from "./components/TaskForm";
import TaskList, { type TaskFilter } from "./components/TaskList";
import type { Task, TaskInput, TaskStatus } from "./types/task";

interface State {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "loading" }
  | { type: "loaded"; tasks: Task[] }
  | { type: "error"; message: string }
  | { type: "added"; task: Task }
  | { type: "updated"; task: Task }
  | { type: "deleted"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { tasks: action.tasks, loading: false, error: null };
    case "error":
      return { ...state, loading: false, error: action.message };
    case "added":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "updated":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case "deleted":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
  }
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function App() {
  const [{ tasks, loading, error }, dispatch] = useReducer(reducer, {
    tasks: [],
    loading: true,
    error: null,
  });
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    dispatch({ type: "loading" });
    try {
      const tasks = await listTasks();
      dispatch({ type: "loaded", tasks });
    } catch (err) {
      dispatch({ type: "error", message: errorMessage(err, "Error al cargar las tareas") });
    }
  }

  function openCreateForm() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  async function handleSubmit(input: TaskInput) {
    if (editingTask) {
      const task = await updateTask(editingTask.id, input);
      dispatch({ type: "updated", task });
    } else {
      const task = await createTask(input);
      dispatch({ type: "added", task });
    }
    setFormOpen(false);
    setEditingTask(null);
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      const task = await updateTask(id, { status });
      dispatch({ type: "updated", task });
    } catch (err) {
      dispatch({ type: "error", message: errorMessage(err, "Error al actualizar la tarea") });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      dispatch({ type: "deleted", id });
    } catch (err) {
      dispatch({ type: "error", message: errorMessage(err, "Error al eliminar la tarea") });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold text-gray-900">Task Manager</h1>
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Nueva tarea
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          filter={filter}
          onFilterChange={setFilter}
          onEdit={openEditForm}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </main>

      {formOpen && (
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

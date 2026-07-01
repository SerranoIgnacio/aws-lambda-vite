import { listTasks, createTask, getTask, updateTask, deleteTask } from "./tasks.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(body),
  };
}

function parseBody(raw) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const path   = event.rawPath ?? event.path ?? "/";

  if (method === "OPTIONS") return reply(200, {});

  const match = path.match(/^\/tasks(?:\/([^/]+))?$/);
  if (!match) return reply(404, { error: "Not Found" });

  const id = match[1] ?? null;

  try {
    if (!id && method === "GET")    return reply(200, await listTasks());
    if (!id && method === "POST")   return reply(201, await createTask(parseBody(event.body)));
    if (id  && method === "GET") {
      const task = await getTask(id);
      return task ? reply(200, task) : reply(404, { error: "Task not found" });
    }
    if (id  && method === "PUT") {
      const task = await updateTask(id, parseBody(event.body));
      return reply(200, task);
    }
    if (id  && method === "DELETE") {
      await deleteTask(id);
      return reply(200, { message: "Task deleted" });
    }
    return reply(405, { error: "Method Not Allowed" });
  } catch (err) {
    const status = err.statusCode ?? (err.name === "ConditionalCheckFailedException" ? 404 : 500);
    const message = status < 500 ? err.message : "Internal Server Error";
    if (status >= 500) console.error(err);
    return reply(status, { error: message });
  }
};

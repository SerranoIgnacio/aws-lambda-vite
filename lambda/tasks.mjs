import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { db, TABLE_NAME } from "./db.mjs";

export async function listTasks() {
  const result = await db.send(new ScanCommand({ TableName: TABLE_NAME }));
  return result.Items ?? [];
}

export async function createTask({ title, description = "", status = "pending" }) {
  if (!title?.trim()) throw Object.assign(new Error("title is required"), { statusCode: 400 });

  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    title: title.trim(),
    description,
    status,
    createdAt: now,
    updatedAt: now,
  };

  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

export async function getTask(id) {
  const result = await db.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return result.Item ?? null;
}

export async function updateTask(id, fields) {
  const allowed = ["title", "description", "status"];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) throw Object.assign(new Error("No valid fields to update"), { statusCode: 400 });

  updates.push(["updatedAt", new Date().toISOString()]);

  const expr = updates.map(([k], i) => `#f${i} = :v${i}`).join(", ");
  const names = Object.fromEntries(updates.map(([k], i) => [`#f${i}`, k]));
  const values = Object.fromEntries(updates.map(([, v], i) => [`:v${i}`, v]));

  const result = await db.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${expr}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return result.Attributes;
}

export async function deleteTask(id) {
  await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
}

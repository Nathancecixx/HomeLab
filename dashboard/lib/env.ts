import fs from "node:fs/promises";
import path from "node:path";

import type { EnvFileSnapshot } from "@/lib/types";

export function parseEnvText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce<Record<string, string>>((acc, line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      const rawValue = line.slice(index + 1).trim();
      acc[key] = rawValue.replace(/^['"]|['"]$/g, "");
      return acc;
    }, {});
}

export async function readEnvFileSnapshot(envPath: string): Promise<EnvFileSnapshot> {
  try {
    const [text, stat] = await Promise.all([fs.readFile(envPath, "utf8"), fs.stat(envPath)]);
    return {
      path: envPath,
      exists: true,
      text,
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch {
    return {
      path: envPath,
      exists: false,
      text: "",
      modifiedAt: null,
    };
  }
}

export async function writeEnvFile(envPath: string, text: string) {
  await fs.mkdir(path.dirname(envPath), { recursive: true });
  await fs.writeFile(envPath, text, "utf8");
}

export async function readEnvRecord(envPath: string) {
  try {
    const text = await fs.readFile(envPath, "utf8");
    return parseEnvText(text);
  } catch {
    return {} as Record<string, string>;
  }
}

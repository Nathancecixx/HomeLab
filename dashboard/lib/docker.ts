import { execFile } from "node:child_process";

import { getServicePaths, resolveServiceApp } from "@/lib/services";
import type {
  AdminAction,
  AdminActionResult,
  ContainerSnapshot,
  DockerSnapshot,
  ServiceRegistryEntry,
  ServiceSnapshot,
  ServiceHealth,
} from "@/lib/types";

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

function runCommand(command: string, args: string[], cwd?: string) {
  return new Promise<CommandResult>((resolve, reject) => {
    execFile(command, args, { cwd, timeout: 20_000 }, (error, stdout, stderr) => {
      if (error) {
        reject({
          stdout: stdout ?? "",
          stderr: stderr ?? error.message,
          exitCode: typeof (error as NodeJS.ErrnoException & { code?: number }).code === "number"
            ? (error as NodeJS.ErrnoException & { code: number }).code
            : null,
        });
        return;
      }

      resolve({ stdout, stderr, exitCode: 0 });
    });
  });
}

function parseLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseDockerPsOutput(stdout: string): ContainerSnapshot[] {
  return parseLines(stdout).map((line) => {
    const [name, image, status, ports] = line.split("||");
    return {
      name: name ?? "",
      image: image ?? "",
      status: status ?? "",
      ports: ports ?? "",
      up: /^up\b/i.test(status ?? ""),
    };
  });
}

export async function listDockerContainers(): Promise<DockerSnapshot> {
  try {
    const { stdout } = await runCommand("docker", [
      "ps",
      "-a",
      "--no-trunc",
      "--format",
      "{{.Names}}||{{.Image}}||{{.Status}}||{{.Ports}}",
    ]);
    const containers = parseDockerPsOutput(stdout);
    const running = containers.filter((container) => container.up).length;

    return {
      count: containers.length,
      running,
      stopped: containers.length - running,
      error: null,
      containers,
    };
  } catch (error) {
    const failure = error as CommandResult;
    return {
      count: 0,
      running: 0,
      stopped: 0,
      error: failure.stderr || "Docker CLI is unavailable.",
      containers: [],
    };
  }
}

async function getComposeServices(cwd: string, args: string[]) {
  try {
    const result = await runCommand("docker", ["compose", ...args], cwd);
    return {
      lines: parseLines(result.stdout),
      error: null,
    };
  } catch (error) {
    const failure = error as CommandResult;
    return {
      lines: [],
      error: failure.stderr || "Compose command failed.",
    };
  }
}

function deriveHealth(definedServices: string[], runningServices: string[], error: string | null): ServiceHealth {
  if (error) {
    return "error";
  }

  if (runningServices.length === 0) {
    return "stopped";
  }

  if (definedServices.length > 0 && runningServices.length < definedServices.length) {
    return "partial";
  }

  return "running";
}

export async function inspectService(service: ServiceRegistryEntry, envText: string, hasEnv: boolean): Promise<ServiceSnapshot> {
  const { modulePath, envPath } = getServicePaths(service);
  const [defined, running] = await Promise.all([
    getComposeServices(modulePath, ["config", "--services"]),
    getComposeServices(modulePath, ["ps", "--services", "--status", "running"]),
  ]);

  const detailError = defined.error ?? running.error;
  const health = deriveHealth(defined.lines, running.lines, detailError);

  return {
    id: service.id,
    label: service.label,
    description: service.description,
    modulePath,
    envPath,
    composeProject: service.composeProject,
    definedServices: defined.lines,
    runningServices: running.lines,
    running: running.lines.length > 0,
    hasEnv,
    health,
    details: detailError
      ? [detailError]
      : running.lines.length > 0
        ? [`${running.lines.length} of ${defined.lines.length || running.lines.length} compose services active.`]
        : ["No compose services are currently running."],
    app: resolveServiceApp(service, envText),
  };
}

export async function runServiceAction(service: ServiceRegistryEntry, action: AdminAction): Promise<AdminActionResult> {
  const { modulePath } = getServicePaths(service);
  const steps: string[][] =
    action === "start"
      ? [["compose", "up", "-d"]]
      : action === "stop"
        ? [["compose", "down"]]
        : [
            ["compose", "down"],
            ["compose", "up", "-d"],
          ];

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = 0;

  for (const step of steps) {
    try {
      const result = await runCommand("docker", step, modulePath);
      stdout += result.stdout;
      stderr += result.stderr;
      exitCode = result.exitCode;
    } catch (error) {
      const failure = error as CommandResult;
      stdout += failure.stdout ?? "";
      stderr += failure.stderr ?? "";
      exitCode = failure.exitCode;
      return {
        ok: false,
        action,
        serviceId: service.id,
        stdout,
        stderr,
        exitCode,
        executedAt: new Date().toISOString(),
      };
    }
  }

  return {
    ok: true,
    action,
    serviceId: service.id,
    stdout,
    stderr,
    exitCode,
    executedAt: new Date().toISOString(),
  };
}

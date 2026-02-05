import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DriveLsRow = {
  id: string;
  name: string;
  type: "file" | "folder";
};

function parsePlainTsv(output: string): DriveLsRow[] {
  const lines = output
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const rows: DriveLsRow[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [id, name, type] = parts;
    if (!id || !name || !type) continue;
    if (type !== "file" && type !== "folder") continue;
    rows.push({ id, name, type });
  }
  return rows;
}

async function gog(args: string[]): Promise<{ stdout: string; stderr: string }> {
  // Prefer stable plain output for parsing.
  const { stdout, stderr } = await execFileAsync("gog", args, {
    env: {
      ...process.env,
      GOG_ACCOUNT: process.env.GOG_ACCOUNT || "manecogomes@gmail.com",
    },
    maxBuffer: 50 * 1024 * 1024,
  });
  return { stdout: String(stdout), stderr: String(stderr) };
}

export async function driveLs(parentId: string, max = 200): Promise<DriveLsRow[]> {
  const { stdout } = await gog([
    "drive",
    "ls",
    "--plain",
    "--max",
    String(max),
    "--parent",
    parentId,
  ]);
  return parsePlainTsv(stdout);
}

export async function driveMkdir(name: string, parentId: string): Promise<{ id: string; link?: string }> {
  const { stdout } = await gog(["drive", "mkdir", name, "--parent", parentId]);
  // plain output is key/value per line: id\t..., name\t..., link\t...
  const out: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const [k, v] = line.split("\t");
    if (k && v) out[k.trim()] = v.trim();
  }
  if (!out.id) throw new Error(`gog drive mkdir failed: ${stdout}`);
  return { id: out.id, link: out.link };
}

export async function driveUrl(fileId: string): Promise<string | null> {
  const { stdout } = await gog(["drive", "url", fileId]);
  // output: <id>\t<url>
  const line = stdout.split("\n").find((l) => l.includes("\t"));
  if (!line) return null;
  const parts = line.split("\t");
  return parts[1] || null;
}

export async function ensureFolder(parentId: string, name: string): Promise<{ id: string; link?: string }> {
  const children = await driveLs(parentId);
  const found = children.find((c) => c.type === "folder" && c.name === name);
  if (found) {
    const link = await driveUrl(found.id);
    return { id: found.id, link: link ?? undefined };
  }
  return driveMkdir(name, parentId);
}

export async function driveUpload(localPath: string, parentId: string): Promise<{ id: string; link?: string }> {
  const { stdout } = await gog(["drive", "upload", localPath, "--parent", parentId]);
  const out: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const [k, v] = line.split("\t");
    if (k && v) out[k.trim()] = v.trim();
  }
  if (!out.id) throw new Error(`gog drive upload failed: ${stdout}`);
  return { id: out.id, link: out.link };
}

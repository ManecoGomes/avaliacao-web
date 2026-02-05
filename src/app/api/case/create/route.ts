import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { driveUpload, ensureFolder } from "@/lib/gogDrive";

export const runtime = "nodejs";

const JARBAS_ROOT_FOLDER_ID = process.env.JARBAS_ROOT_FOLDER_ID || "1JtKGCkfOHZ8xR97vSxD12fOvIC0stqz7";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

async function saveToTmp(file: File, caseId: string, subdir: string): Promise<string> {
  const dir = join("/tmp", "avaliacao-web", caseId, subdir);
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = join(dir, `${Date.now()}-${safeName}`);
  await writeFile(path, buf);
  return path;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const tipo = String(form.get("tipo") || "");
    if (!tipo || !["apartamento", "casa", "terreno"].includes(tipo)) {
      return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
    }

    const iptu = form.get("iptu");
    if (!(iptu instanceof File) || iptu.size === 0) {
      return NextResponse.json({ error: "iptu obrigatorio" }, { status: 400 });
    }

    const fotos = form.getAll("fotos").filter((x) => x instanceof File) as File[];
    if (fotos.length > 5) {
      return NextResponse.json({ error: "max 5 fotos" }, { status: 400 });
    }

    const caseId = randomUUID();
    const now = new Date();
    const year = String(now.getFullYear());
    const month = pad2(now.getMonth() + 1);

    // Ensure Drive folder structure: Jarbas/Avaliacoes/Comparativo/<year>/<month>/<caseId>/...
    const avaliacoes = await ensureFolder(JARBAS_ROOT_FOLDER_ID, "Avaliacoes");
    const comparativo = await ensureFolder(avaliacoes.id, "Comparativo");
    const yFolder = await ensureFolder(comparativo.id, year);
    const mFolder = await ensureFolder(yFolder.id, month);
    const caseFolder = await ensureFolder(mFolder.id, caseId);

    const inputFolder = await ensureFolder(caseFolder.id, "input");
    const iptuFolder = await ensureFolder(inputFolder.id, "iptu");
    const fotosFolder = await ensureFolder(inputFolder.id, "fotos");
    const outputFolder = await ensureFolder(caseFolder.id, "output");
    const logsFolder = await ensureFolder(caseFolder.id, "logs");

    // Upload IPTU
    const iptuTmp = await saveToTmp(iptu, caseId, "iptu");
    const iptuUp = await driveUpload(iptuTmp, iptuFolder.id);

    // Upload photos
    const fotosUp: Array<{ id: string; link?: string; name: string }> = [];
    for (const f of fotos) {
      const tmp = await saveToTmp(f, caseId, "fotos");
      const up = await driveUpload(tmp, fotosFolder.id);
      fotosUp.push({ ...up, name: f.name });
    }

    const caseJson = {
      caseId,
      tipo,
      createdAt: now.toISOString(),
      drive: {
        rootId: caseFolder.id,
        rootLink: caseFolder.link,
        input: { id: inputFolder.id },
        iptu: { id: iptuFolder.id, file: iptuUp },
        fotos: { id: fotosFolder.id, files: fotosUp },
        output: { id: outputFolder.id },
        logs: { id: logsFolder.id },
      },
      status: "RECEIVED",
    };

    // Write case.json locally then upload
    const tmpCasePath = join("/tmp", "avaliacao-web", caseId, "case.json");
    await writeFile(tmpCasePath, Buffer.from(JSON.stringify(caseJson, null, 2)));
    const caseJsonUp = await driveUpload(tmpCasePath, logsFolder.id);

    return NextResponse.json({
      ok: true,
      caseId,
      drive: {
        root: caseFolder,
        caseJson: caseJsonUp,
        iptu: iptuUp,
        fotos: fotosUp,
      },
      next: {
        confirmUrl: `/case/${caseId}`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "internal_error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

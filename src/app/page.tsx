"use client";

import { useState } from "react";

type CreateCaseResult = Record<string, unknown> & {
    caseId?: string;
    drive?: {
          root?: {
                  link?: string;
                };
        };
  };


export default function Home() {
  const [tipo, setTipo] = useState("apartamento");
  const [iptu, setIptu] = useState<File | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [result, setResult] = useState<CreateCaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!iptu) {
      setError("Selecione o arquivo do IPTU.");
      return;
    }

    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("iptu", iptu);
    fotos.forEach((f) => fd.append("fotos", f));

    setLoading(true);
    try {
      const res = await fetch("/api/case/create", { method: "POST", body: fd });
      const json = await res.json();
      const j = json as Record<string, unknown>;
      if (!res.ok) throw new Error(String((j as any)?.detail ?? (j as any)?.error ?? "Erro"));
setResult(j as CreateCaseResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Avaliacao Imobiliaria (MVP)</h1>
      <p className="text-sm text-gray-600 mt-2">
        Envie o carne de IPTU e ate 5 fotos. O sistema salva tudo no Google Drive (Jarbas).
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium">Tipo de imovel</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="apartamento">apartamento</option>
            <option value="casa">casa</option>
            <option value="terreno">terreno</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Carne de IPTU (arquivo)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setIptu(e.target.files?.[0] || null)}
            className="mt-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Fotos (ate 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setFotos(files.slice(0, 5));
            }}
            className="mt-1 w-full"
          />
          <div className="text-xs text-gray-600 mt-1">Selecionadas: {fotos.length}</div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Criar avaliacao"}
        </button>

        {error ? <div className="text-red-600 text-sm">{error}</div> : null}

        {result ? (
          <div className="border rounded p-4 text-sm space-y-2">
            <div>
              <b>CaseId:</b> {result.caseId}
            </div>
            <div>
              <b>Pasta no Drive:</b>{" "}
              {result.drive?.root?.link ? (
                <a className="underline" href={result.drive.root.link} target="_blank">
                  abrir
                </a>
              ) : (
                "(sem link)"
              )}
            </div>
            <pre className="bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : null}
      </form>
    </main>
  );
}

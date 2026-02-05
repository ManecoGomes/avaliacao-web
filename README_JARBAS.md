# avaliacao-web

MVP Web App (Next.js) para avaliacao imobiliaria (metodo comparativo).

## Dominio
- avaliacao.maneco.net.br (sem acentos)

## Armazenamento
- Google Drive: pasta Jarbas/Avaliacoes/Comparativo/<ano>/<mes>/<case_id>/

## Status
- Scaffold criado (Next.js + Tailwind + App Router)
- Proximos passos: endpoints de upload, integracao Drive (gog), OCR IPTU, fluxo de confirmacao.

## Dev
```bash
cd /home/maneco/clawd/projects/imobiliaria/avaliacao-web
npm run dev
```

## Coolify (importante)
Este app usa o CLI `gog` para Drive.
No deploy em container (Coolify), voce precisa montar:
- binario: `/home/linuxbrew/.linuxbrew/bin/gog` -> `/usr/local/bin/gog` (read-only)
- config: `/home/maneco/.config/gogcli` -> `/root/.config/gogcli` (read-only)

Env vars:
- `GOG_ACCOUNT=manecogomes@gmail.com`
- `JARBAS_ROOT_FOLDER_ID=1JtKGCkfOHZ8xR97vSxD12fOvIC0stqz7`

# Gestión de Vacantes — Clínica Santa Bárbara

Sistema de gestión de vacantes y procesos de selección: solicitud, aprobación
jerárquica, requisición, reclutamiento, evaluación de candidatos, oferta,
contratación e inducción.

## Stack

React 19 + Vite + TypeScript + Tailwind CSS v4, Supabase (Postgres + Auth + RLS
+ Edge Functions), Recharts, ExcelJS/pdfmake para exportación.

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere un archivo `.env.local` con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY` (no se versiona).

## Despliegue

Automático a GitHub Pages vía GitHub Actions al hacer push a `main`.

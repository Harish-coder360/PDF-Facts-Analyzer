# PDF Facts Analyzer

Small full-stack app to upload a PDF, ask for textual pointers (e.g., "List all dates"), and get back matching snippets with page numbers, offsets, and rationales.

## Project Layout
- `backend/` – FastAPI service that handles uploads, extracts text with PyPDF2, scores snippets, and stores files under `backend/uploads/`.
- `backend/sample_data/contract.pdf` – Generated sample PDF plus `pointers.json` with example prompts.
- `frontend/` – Next.js single-page app for the form + results display.

## Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### API
- `POST /api/extract` – multipart form with:
  - `file`: PDF upload.
  - `pointers`: JSON array of strings, e.g. `["List all dates", "Who signed?"]`.
- Response includes `pointers` each with `matches` (snippet, `page`, `start`, `end`, `rationale`). Offsets are within the page text extracted by PyPDF2.
- `GET /api/health` – simple status check.

### Quick test with sample assets
```bash
cd backend
curl -X POST http://localhost:8000/api/extract \
  -F file=@sample_data/contract.pdf \
  -F pointers='["List all dates","Who signed the contract?","What is the total contract value?"]'
```

## Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev  # opens on http://localhost:3000
```
- Configure a different backend URL via `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8000`).
- UI supports entering multiple pointers (one per line), PDF upload, and expandable rationales per snippet.

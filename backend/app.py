from __future__ import annotations

import difflib
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PyPDF2 import PdfReader


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="PDF Facts Analyzer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_pdf_pages(pdf_path: Path) -> List[Dict[str, Any]]:
    """Extract text from each page of the PDF."""
    reader = PdfReader(str(pdf_path))
    pages = []
    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page": idx, "text": text})
    return pages


def compute_similarity(sentence: str, pointer: str) -> float:
    """Lightweight similarity score between a sentence and pointer text."""
    ratio = difflib.SequenceMatcher(None, sentence.lower(), pointer.lower()).ratio()
    keyword_hits = sum(1 for token in re.findall(r"\w+", pointer.lower()) if token in sentence.lower())
    return ratio + 0.1 * keyword_hits


def find_snippets(page_text: str, pointer: str, max_snippets: int = 2) -> List[Dict[str, Any]]:
    """Return top-matching snippets on a page for a given pointer."""
    pattern = re.compile(r"[^.!?\\n]+[.!?]?")
    candidates = []
    for match in pattern.finditer(page_text):
        sentence = match.group().strip()
        if not sentence:
            continue
        score = compute_similarity(sentence, pointer)
        candidates.append(
            {
                "snippet": sentence,
                "start": match.start(),
                "end": match.end(),
                "score": score,
            }
        )

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return candidates[:max_snippets]


def build_response_entry(pointer: str, pages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create the response payload for a single pointer across pages."""
    matches: List[Dict[str, Any]] = []
    for page in pages:
        snippets = find_snippets(page["text"], pointer)
        for snippet in snippets:
            matches.append(
                {
                    "snippet": snippet["snippet"],
                    "page": page["page"],
                    "start": snippet["start"],
                    "end": snippet["end"],
                    "rationale": f"Sentence matched pointer '{pointer}' with similarity {snippet['score']:.2f}.",
                }
            )

    if not matches:
        return {
            "pointer": pointer,
            "matches": [
                {
                    "snippet": "",
                    "page": None,
                    "start": None,
                    "end": None,
                    "rationale": "No matching text found for the pointer.",
                }
            ],
        }

    matches.sort(key=lambda item: item["page"] if item["page"] is not None else 1_000_000)
    return {"pointer": pointer, "matches": matches}


@app.post("/api/extract")
async def extract_facts(file: UploadFile = File(...), pointers: str = Form(...)) -> JSONResponse:
    """Accept a PDF and list of textual pointers, then return matching snippets."""
    try:
        pointer_list = json.loads(pointers)
        if not isinstance(pointer_list, list):
            raise ValueError
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="`pointers` must be a JSON array of strings") from exc

    if not pointer_list:
        raise HTTPException(status_code=400, detail="At least one pointer is required")

    if not all(isinstance(item, str) for item in pointer_list):
        raise HTTPException(status_code=400, detail="All pointers must be strings")

    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename

    with file_path.open("wb") as buffer:
        content = await file.read()
        buffer.write(content)

    pages = load_pdf_pages(file_path)
    payload = {
        "fileName": file.filename,
        "storedPath": str(file_path),
        "pointers": [build_response_entry(pointer, pages) for pointer in pointer_list],
    }
    return JSONResponse(payload)


@app.get("/api/health")
def health() -> Dict[str, str]:
    """Simple health endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)

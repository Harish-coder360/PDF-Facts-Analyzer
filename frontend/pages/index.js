import { useMemo, useState } from "react";

const defaultPointers = [
  "List all dates",
  "Who signed the contract?",
  "What is the total contract value?",
  "Key contact person",
];

export default function Home() {
  const [file, setFile] = useState(null);
  const [pointerText, setPointerText] = useState(defaultPointers.join("\n"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000",
    [],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const pointers = pointerText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    if (!file) {
      setError("Please attach a PDF first.");
      return;
    }
    if (!pointers.length) {
      setError("Add at least one pointer.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pointers", JSON.stringify(pointers));

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/extract`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || "Failed to extract facts.");
      }
      const payload = await response.json();
      setResults(payload);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const pointerCount = useMemo(
    () => pointerText.split("\n").filter((line) => line.trim()).length,
    [pointerText],
  );

  return (
    <div className="page">
      <header className="hero">
        <div className="pill">PDF Facts Analyzer</div>
        <h1>
          Extract the exact snippets you need
          <span className="accent"> from any PDF.</span>
        </h1>
        <p>
          Upload a PDF and describe the facts you want. We scan the document,
          surface the best matching snippets, and show where they live.
        </p>
      </header>

      <main className="layout">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Input</p>
              <h2>Upload + pointers</h2>
            </div>
            <span className="badge">{pointerCount} pointers</span>
          </div>

          <form onSubmit={onSubmit} className="form">
            <label className="field">
              <span>PDF document</span>
              <div className="file-input">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && <p className="filename">{file.name}</p>}
              </div>
            </label>

            <label className="field">
              <span>Pointers (one per line)</span>
              <textarea
                rows={6}
                value={pointerText}
                onChange={(e) => setPointerText(e.target.value)}
                placeholder='e.g. "List all dates", "Total contract value?"'
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="cta" disabled={loading}>
              {loading ? "Extracting..." : "Find facts"}
            </button>
          </form>
        </section>

        <section className="card results">
          <div className="card-header">
            <div>
              <p className="eyebrow">Results</p>
              <h2>Snippets per pointer</h2>
            </div>
            {results?.fileName && <span className="tag">Source: {results.fileName}</span>}
          </div>

          {!results && <p className="muted">No results yet. Run an extraction to see matches.</p>}

          {results?.pointers?.map((pointer) => (
            <article key={pointer.pointer} className="pointer-block">
              <div className="pointer-header">
                <h3>{pointer.pointer}</h3>
                <span className="mini">{pointer.matches?.length || 0} matches</span>
              </div>

              {pointer.matches?.map((match, idx) => (
                <div key={idx} className="match">
                  <div className="snippet">“{match.snippet || "No snippet found"}”</div>
                  <div className="meta">
                    <span>Page {match.page ?? "-"}</span>
                    <span>
                      Offsets {match.start ?? "-"} – {match.end ?? "-"}
                    </span>
                  </div>
                  <details>
                    <summary>Why this</summary>
                    <p className="muted">{match.rationale}</p>
                  </details>
                </div>
              ))}
            </article>
          ))}
        </section>
      </main>

      <style jsx>{`
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }
        .hero {
          max-width: 820px;
          margin-bottom: 32px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        h1 {
          font-size: clamp(32px, 4vw, 48px);
          margin: 12px 0 12px;
          line-height: 1.1;
        }
        .accent {
          color: var(--accent);
        }
        .hero p {
          color: var(--muted);
          margin: 0;
          font-size: 17px;
        }
        .layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }
        .card {
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        h2 {
          margin: 0;
          font-size: 22px;
        }
        .eyebrow {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          color: var(--muted);
        }
        .badge,
        .tag {
          padding: 6px 10px;
          border-radius: 10px;
          background: rgba(103, 232, 249, 0.15);
          color: var(--accent);
          font-weight: 600;
          font-size: 12px;
        }
        .tag {
          background: rgba(168, 85, 247, 0.2);
          color: var(--accent-strong);
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: var(--muted);
          font-size: 14px;
        }
        .field span {
          color: var(--text);
          font-weight: 600;
        }
        .file-input {
          border: 1px dashed var(--border);
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
        }
        textarea {
          width: 100%;
          resize: vertical;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px;
          color: var(--text);
          font-size: 14px;
          font-family: "Inter", system-ui, sans-serif;
        }
        .filename {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 13px;
        }
        .error {
          color: #f87171;
          font-weight: 600;
          margin: 0;
        }
        .cta {
          margin-top: 4px;
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(90deg, #67e8f9, #a855f7);
          color: #0a0f1d;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .cta:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(103, 232, 249, 0.25);
        }
        .results .muted {
          color: var(--muted);
          margin: 0;
        }
        .pointer-block {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          margin-top: 12px;
          background: rgba(255, 255, 255, 0.02);
        }
        .pointer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pointer-header h3 {
          margin: 0;
        }
        .mini {
          font-size: 12px;
          color: var(--muted);
          padding: 6px 8px;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .match {
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-top: 10px;
        }
        .match:first-of-type {
          border-top: none;
          padding-top: 4px;
          margin-top: 4px;
        }
        .snippet {
          font-size: 15px;
          color: #f8fbff;
          margin-bottom: 4px;
        }
        .meta {
          display: flex;
          gap: 14px;
          color: var(--muted);
          font-size: 13px;
        }
        details {
          margin-top: 4px;
        }
        summary {
          cursor: pointer;
          color: var(--accent);
        }
        @media (max-width: 720px) {
          .layout {
            grid-template-columns: 1fr;
          }
          .card-header {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

from __future__ import annotations

from pathlib import Path


def build_pdf_bytes() -> bytes:
    content_ops = [
        "BT",
        "/F1 18 Tf",
        "72 740 Td",
        "(Contract between Northwind LLC and Contoso Inc.) Tj",
        "0 -22 Td (Effective date: 2023-10-10.) Tj",
        "0 -22 Td (Services: Systems integration and analytics delivery.) Tj",
        "0 -22 Td (Total contract value: $250,000 split across milestones.) Tj",
        "0 -22 Td (Key contact: Jane Doe, Procurement Lead.) Tj",
        "0 -22 Td (Signed by: Alice Smith on behalf of Northwind.) Tj",
        "0 -22 Td (Signed by: Bob Johnson on behalf of Contoso.) Tj",
        "ET",
    ]
    content_stream = "\n".join(content_ops)
    content_bytes = content_stream.encode("latin-1")
    objects: list[str] = []

    def add_object(obj_id: int, body: str) -> None:
        objects.append(f"{obj_id} 0 obj\n{body}\nendobj\n")

    add_object(1, "<< /Type /Catalog /Pages 2 0 R >>")
    add_object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add_object(
        3,
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
    )
    add_object(4, f"<< /Length {len(content_bytes)} >>\nstream\n{content_stream}\nendstream")
    add_object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    header = "%PDF-1.4\n"
    pdf_parts = [header]
    offsets = [0]  # object 0 offset placeholder

    for obj in objects:
        offsets.append(len("".join(pdf_parts).encode("latin-1")))
        pdf_parts.append(obj)

    xref_start = len("".join(pdf_parts).encode("latin-1"))
    xref_lines = [
        f"xref\n0 {len(objects) + 1}\n",
        "0000000000 65535 f \n",
    ]
    for off in offsets[1:]:
        xref_lines.append(f"{off:010d} 00000 n \n")

    trailer = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
    pdf_parts.extend(xref_lines)
    pdf_parts.append(trailer)

    return "".join(pdf_parts).encode("latin-1")


def main() -> None:
    target = Path(__file__).resolve().parent / "contract.pdf"
    target.write_bytes(build_pdf_bytes())
    print(f"Wrote sample PDF to {target}")


if __name__ == "__main__":
    main()

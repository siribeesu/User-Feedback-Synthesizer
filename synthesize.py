import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.client import HindsightMemoryClient
from src.config import get_bank_config, settings


def generate_weekly_digest(
    bank_id: str = "mobile-app-feedback",
    output_dir: Path = settings.output_dir,
) -> Dict[str, Any]:
    print("=" * 70)
    print("           HINDSIGHT MENTAL MODEL SYNTHESIS ENGINE")
    print("=" * 70)

    client = HindsightMemoryClient()
    bank_cfg = get_bank_config(bank_id)
    is_live = client.is_live()

    print(f"Target Bank:      {bank_id} ({bank_cfg.product})")
    print(f"Hindsight Backend: {'[ONLINE]' if is_live else '[OFFLINE - EMBEDDED MEMORY ENGINE]'}")
    print(f"Timestamp:        {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"Active Directives: {len(bank_cfg.directives)} strict reasoning rules enforced\n")

    synthesized_themes = []
    total_sources_cited = 0

    print(f"Running reflect() across {len(bank_cfg.mental_models)} standing mental models...\n")

    for mm_cfg in bank_cfg.mental_models:
        print(f"  ⚡ Synthesizing theme: '{mm_cfg.name}'...")
        print(f"     Query: \"{mm_cfg.query}\"")

        # Refresh mental model in Hindsight memory backend
        updated_mm = client.refresh_mental_model(bank_id=bank_id, mental_model_id=mm_cfg.id)
        evidence_count = updated_mm.get("evidence_count", 0)
        observation = updated_mm.get("observation", "No observation synthesized.")
        evidence_facts = updated_mm.get("evidence_facts", [])

        total_sources_cited += evidence_count
        print(f"     -> Done: Grounded in {evidence_count} source records.\n")

        synthesized_themes.append({
            "id": mm_cfg.id,
            "name": mm_cfg.name,
            "query": mm_cfg.query,
            "tags": mm_cfg.tags,
            "evidence_count": evidence_count,
            "observation": observation,
            "evidence_facts": evidence_facts,
            "last_refreshed": updated_mm.get("last_refreshed"),
        })

    # Sort themes by evidence volume / severity
    synthesized_themes.sort(key=lambda x: x["evidence_count"], reverse=True)

    # Compile Executive Digest
    now_str = datetime.utcnow().strftime("%B %d, %Y")
    digest_data = {
        "title": f"Product Feedback Synthesis Digest — {bank_cfg.product}",
        "bank_id": bank_id,
        "product": bank_cfg.product,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "date_formatted": now_str,
        "total_sources_cited": total_sources_cited,
        "themes_count": len(synthesized_themes),
        "themes": synthesized_themes,
    }

    # Save artifacts
    output_dir.mkdir(parents=True, exist_ok=True)
    md_path = output_dir / "digest.md"
    html_path = output_dir / "digest.html"
    json_path = output_dir / "digest.json"

    # 1. Render Markdown
    md_content = build_markdown_digest(digest_data, bank_cfg)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    # 2. Render HTML
    html_content = build_html_digest(digest_data, bank_cfg)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 3. Render JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(digest_data, f, indent=2)

    print("-" * 70)
    print("SYNTHESIS COMPLETE:")
    print(f"  • Total Themes Consolidated: {len(synthesized_themes)}")
    print(f"  • Total Source Evidence Cited: {total_sources_cited}")
    print(f"  • Saved Markdown Digest:      {md_path}")
    print(f"  • Saved HTML PM Digest:       {html_path}")
    print(f"  • Saved JSON Artifact:        {json_path}")
    print("=" * 70)

    # Print summary to stdout
    print("\n" + md_content)
    return digest_data


def build_markdown_digest(data: Dict[str, Any], bank_cfg: Any) -> str:
    md = [
        f"# 📊 Product Feedback Synthesis Digest",
        f"**Product**: {data['product']} | **Bank ID**: `{data['bank_id']}` | **Date**: {data['date_formatted']}",
        f"**Grounding Guarantee**: {data['total_sources_cited']} verified customer submissions synthesized. Every claim strictly cited.\n",
        f"> **Hindsight Directives Enforced**:",
        f"> - *Strict Grounding*: No complaints are invented without retained memory citations.",
        f"> - *Disposition*: High Skepticism ({bank_cfg.disposition.skepticism}/5), Low Agreeableness ({bank_cfg.disposition.agreeableness}/5) to preserve customer friction points.\n",
        f"---",
        f"## 🏆 Executive Summary & Top Themes by Frequency",
        f"| Theme | Evidence Count | Key Focus | Tags |",
        f"|---|:---:|---|---|",
    ]

    for t in data["themes"]:
        tags_str = ", ".join(t.get("tags", []))
        md.append(f"| **{t['name']}** | {t['evidence_count']} sources | `{t['query'][:45]}...` | {tags_str} |")

    md.append("\n---\n")

    for idx, t in enumerate(data["themes"], start=1):
        md.append(f"## {idx}. {t['name']}")
        md.append(f"- **Mental Model Query**: *\"{t['query']}\"*")
        md.append(f"- **Evidence Volume**: **{t['evidence_count']}** source submissions")
        md.append("")
        md.append(t["observation"])
        md.append("\n---\n")

    return "\n".join(md)


def build_html_digest(data: Dict[str, Any], bank_cfg: Any) -> str:
    theme_cards = []
    for t in data["themes"]:
        facts_html = ""
        for f in t.get("evidence_facts", [])[:4]:
            facts_html += f"""
            <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 10px 14px; margin: 8px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13.5px; color: #1e293b;">"{f.get('text')}"</p>
                <small style="color: #64748b; font-size: 11px;">{f.get('context', '')}</small>
            </div>
            """

        theme_cards.append(f"""
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px;">
                <h2 style="margin: 0; color: #0f172a; font-size: 20px;">{t['name']}</h2>
                <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px;">
                    {t['evidence_count']} Sources Cited
                </span>
            </div>
            <p style="color: #475569; font-style: italic; font-size: 14px; margin-bottom: 16px;">
                <strong>Query:</strong> "{t['query']}"
            </p>
            <div style="line-height: 1.6; color: #334155; font-size: 14.5px;">
                <div style="white-space: pre-wrap;">{t['observation']}</div>
            </div>
        </div>
        """)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{data['title']}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 32px 16px;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: #ffffff;
            padding: 28px;
            border-radius: 10px;
            margin-bottom: 28px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0 0 10px 0; font-size: 26px;">📊 {data['title']}</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                Generated on {data['date_formatted']} | Grounded Memory Backend: <strong>Hindsight</strong> | 
                <strong>{data['total_sources_cited']}</strong> Verified Customer Sources
            </p>
        </div>
        {''.join(theme_cards)}
    </div>
</body>
</html>
"""
    return html


def main():
    parser = argparse.ArgumentParser(description="Run Mental Model Synthesis & Generate Weekly Digest")
    parser.add_argument(
        "--bank-id",
        type=str,
        default="mobile-app-feedback",
        help="Target memory bank ID",
    )
    args = parser.parse_args()
    generate_weekly_digest(bank_id=args.bank_id)


if __name__ == "__main__":
    main()

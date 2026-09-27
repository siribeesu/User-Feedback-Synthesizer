import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.client import HindsightMemoryClient
from src.config import settings


import io
import zipfile


def load_feedback_file(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists():
        raise FileNotFoundError(f"Feedback file not found: {file_path}")

    items: List[Dict[str, Any]] = []

    # If it is a directory / folder
    if file_path.is_dir():
        for sub_file in file_path.rglob("*"):
            if sub_file.is_file() and not sub_file.name.startswith("."):
                try:
                    items.extend(load_feedback_file(sub_file))
                except Exception:
                    continue
        return items

    ext = file_path.suffix.lower()

    if ext == ".zip":
        with zipfile.ZipFile(file_path, "r") as z:
            for member in z.infolist():
                if member.is_dir() or member.filename.startswith("__MACOSX") or Path(member.filename).name.startswith("."):
                    continue
                member_ext = Path(member.filename).suffix.lower()
                try:
                    with z.open(member) as f:
                        raw_bytes = f.read()
                        text_content = raw_bytes.decode("utf-8", errors="replace")

                        if member_ext == ".json":
                            parsed = json.loads(text_content)
                            if isinstance(parsed, list):
                                items.extend(parsed)
                            elif isinstance(parsed, dict) and "feedback" in parsed:
                                items.extend(parsed["feedback"])
                            else:
                                items.append(parsed)
                        elif member_ext == ".csv":
                            reader = csv.DictReader(io.StringIO(text_content))
                            for row in reader:
                                if "rating" in row and row["rating"]:
                                    try:
                                        row["rating"] = int(float(row["rating"]))
                                    except ValueError:
                                        pass
                                items.append(row)
                        elif member_ext in (".txt", ".md"):
                            clean_text = text_content.strip()
                            if clean_text:
                                items.append({
                                    "title": Path(member.filename).stem.replace("_", " ").title(),
                                    "content": clean_text,
                                    "source": "Interview Transcript",
                                    "rating": 3,
                                    "user_name": Path(member.filename).stem,
                                    "segment": "Research",
                                    "app_version": "v2.3",
                                })
                except Exception as ze:
                    print(f"  [Warning] Skipping archive entry {member.filename}: {ze}")
                    continue

    elif ext == ".json":
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and "feedback" in data:
                items = data["feedback"]
            else:
                items = [data]

    elif ext == ".csv":
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if "rating" in row and row["rating"]:
                    try:
                        row["rating"] = int(float(row["rating"]))
                    except ValueError:
                        pass
                items.append(row)

    elif ext in (".txt", ".md"):
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read().strip()
            if content:
                items.append({
                    "title": file_path.stem.replace("_", " ").title(),
                    "content": content,
                    "source": "Interview Transcript",
                    "rating": 3,
                    "user_name": file_path.stem,
                    "segment": "Research",
                    "app_version": "v2.3",
                })
    else:
        raise ValueError(f"Unsupported file format: {ext}. Expected .zip, .csv, .json, or .txt/.md")

    return items


def import_feedback(
    file_path: Path,
    bank_id: str = "mobile-app-feedback",
    batch_size: int = 25,
) -> Dict[str, Any]:
    print("=" * 65)
    print("             HINDSIGHT USER FEEDBACK INGESTION PIPELINE")
    print("=" * 65)

    client = HindsightMemoryClient()
    is_live = client.is_live()
    print(f"Target Bank:      {bank_id}")
    print(f"Hindsight Backend: {'[ONLINE]' if is_live else '[OFFLINE - LOCAL STORAGE]'}")
    print(f"Source File:      {file_path.name}")

    items = load_feedback_file(file_path)
    total_items = len(items)
    print(f"Loaded Records:   {total_items} feedback submissions\n")

    retained_count = 0
    theme_distribution: Dict[str, int] = {}
    source_distribution: Dict[str, int] = {}

    for i in range(0, total_items, batch_size):
        chunk = items[i : i + batch_size]
        result = client.retain_batch(bank_id=bank_id, items=chunk)
        retained_count += result["count"]

        for item in chunk:
            theme = item.get("theme", "general")
            src = item.get("source", "unknown")
            theme_distribution[theme] = theme_distribution.get(theme, 0) + 1
            source_distribution[src] = source_distribution.get(src, 0) + 1

        print(f"  -> Retained batch {i + 1} to {min(i + batch_size, total_items)} of {total_items}...")

    print("\n" + "-" * 65)
    print("INGESTION SUMMARY:")
    print(f"  • Total Retained in Memory Bank: {retained_count} items")
    print(f"  • Themes Breakdown:")
    for t, c in sorted(theme_distribution.items(), key=lambda x: x[1], reverse=True):
        print(f"      - {t}: {c} records")
    print(f"  • Source Breakdown:")
    for s, c in sorted(source_distribution.items(), key=lambda x: x[1], reverse=True):
        print(f"      - {s}: {c} records")
    print("=" * 65)

    return {
        "bank_id": bank_id,
        "total_retained": retained_count,
        "theme_distribution": theme_distribution,
        "source_distribution": source_distribution,
    }


def main():
    parser = argparse.ArgumentParser(description="Ingest User Feedback into Hindsight")
    parser.add_argument(
        "--file",
        type=str,
        default=str(settings.data_dir / "sample_feedback.csv"),
        help="Path to CSV or JSON feedback file",
    )
    parser.add_argument(
        "--bank-id",
        type=str,
        default="mobile-app-feedback",
        help="Target Hindsight memory bank ID",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=25,
        help="Batch size for retention pipeline",
    )
    args = parser.parse_args()

    file_path = Path(args.file)
    import_feedback(file_path=file_path, bank_id=args.bank_id, batch_size=args.batch_size)


if __name__ == "__main__":
    main()

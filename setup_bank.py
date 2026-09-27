import argparse
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from src.client import HindsightMemoryClient
from src.config import get_bank_config, load_banks_config


def setup_bank(bank_id: str):
    print("=" * 65)
    print("      HINDSIGHT MEMORY BANK INITIALIZATION & CONFIGURATION")
    print("=" * 65)

    client = HindsightMemoryClient()
    is_live = client.is_live()
    print(f"Backend Target: {client.base_url}")
    print(f"Hindsight Live Server Status: {'[ONLINE]' if is_live else '[OFFLINE - USING LOCAL EMBEDDED MEMORY]'}")

    try:
        bank_cfg = get_bank_config(bank_id)
    except KeyError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print(f"\nConfiguring Bank ID: {bank_cfg.bank_id}")
    print(f"Product: {bank_cfg.product}")
    print(f"Mission:\n  \"{bank_cfg.mission}\"")

    print("\nDirectives:")
    for d in bank_cfg.directives:
        print(f"  • [{d.name}] (Priority {d.priority}): \"{d.content}\"")

    print("\nDisposition Parameters:")
    print(f"  • Skepticism:    {bank_cfg.disposition.skepticism}/5 (Strict truth-checking)")
    print(f"  • Agreeableness: {bank_cfg.disposition.agreeableness}/5 (Preserves user contradictions)")
    print(f"  • Literalism:    {bank_cfg.disposition.literalism}/5 (Grounds in verbatim feedback)")
    print(f"  • Empathy:       {bank_cfg.disposition.empathy}/5 (Unvarnished analytical reporting)")

    print(f"\nConfiguring {len(bank_cfg.mental_models)} Standing Mental Models:")
    for mm in bank_cfg.mental_models:
        print(f"  • [{mm.id}] {mm.name}")
        print(f"    Query: \"{mm.query}\"")

    result = client.create_or_update_bank(bank_cfg)
    print("\n" + "-" * 65)
    print(f"Setup Result: {result}")
    print("=" * 65)
    return result


def main():
    parser = argparse.ArgumentParser(description="Configure Hindsight Memory Bank")
    parser.add_argument(
        "--bank-id",
        type=str,
        default="mobile-app-feedback",
        help="Bank ID to configure from config/banks.yaml",
    )
    args = parser.parse_args()
    setup_bank(args.bank_id)


if __name__ == "__main__":
    main()

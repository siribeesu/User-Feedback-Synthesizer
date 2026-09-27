import os
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import yaml
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class DirectiveConfig(BaseModel):
    name: str
    content: str
    priority: int = 1
    is_active: bool = True
    tags: Optional[List[str]] = None


class DispositionConfig(BaseModel):
    skepticism: int = 5
    agreeableness: int = 1
    literalism: int = 4
    empathy: int = 1


class MentalModelConfig(BaseModel):
    id: str
    name: str
    query: str
    tags: List[str] = Field(default_factory=list)


class BankConfig(BaseModel):
    bank_id: str
    name: str
    product: str
    mission: str
    directives: List[DirectiveConfig] = Field(default_factory=list)
    disposition: DispositionConfig = Field(default_factory=DispositionConfig)
    mental_models: List[MentalModelConfig] = Field(default_factory=list)


class Settings(BaseModel):
    hindsight_base_url: str = Field(
        default_factory=lambda: os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888")
    )
    hindsight_api_key: Optional[str] = Field(
        default_factory=lambda: os.getenv("HINDSIGHT_API_KEY") or None
    )
    default_bank_id: str = Field(
        default_factory=lambda: os.getenv("DEFAULT_BANK_ID", "mobile-app-feedback")
    )
    api_port: int = Field(
        default_factory=lambda: int(os.getenv("API_PORT", "8000"))
    )
    dashboard_port: int = Field(
        default_factory=lambda: int(os.getenv("DASHBOARD_PORT", "8501"))
    )
    config_file: Path = BASE_DIR / "config" / "banks.yaml"
    output_dir: Path = BASE_DIR / "output"
    data_dir: Path = BASE_DIR / "data"


def load_banks_config(config_path: Optional[Path] = None) -> Dict[str, BankConfig]:
    path = config_path or (BASE_DIR / "config" / "banks.yaml")
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    raw_banks = data.get("banks", {})
    banks: Dict[str, BankConfig] = {}
    for bank_id, cfg in raw_banks.items():
        cfg["bank_id"] = bank_id
        banks[bank_id] = BankConfig(**cfg)
    return banks


def get_bank_config(bank_id: Optional[str] = None) -> BankConfig:
    banks = load_banks_config()
    chosen_id = bank_id or os.getenv("DEFAULT_BANK_ID", "mobile-app-feedback")
    if chosen_id not in banks:
        available = list(banks.keys())
        raise KeyError(f"Bank '{chosen_id}' not found. Available banks: {available}")
    return banks[chosen_id]


settings = Settings()

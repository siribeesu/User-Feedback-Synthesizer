import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from src.config import settings

def _get_resolutions_file() -> Path:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings.data_dir / "resolutions.json"

def _load_resolutions() -> Dict[str, Any]:
    file_path = _get_resolutions_file()
    if not file_path.exists():
        return {"resolutions": {}}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"resolutions": {}}

def _save_resolutions(data: Dict[str, Any]) -> None:
    with open(_get_resolutions_file(), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def _get_memories() -> List[Dict[str, Any]]:
    # Helper to get memories for avg rating calculation
    bank_file = settings.data_dir / "hindsight_local_bank.json"
    if not bank_file.exists():
        return []
    try:
        with open(bank_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("memories", {}).get(settings.default_bank_id, [])
    except Exception:
        return []

def list_resolutions() -> List[Dict[str, Any]]:
    data = _load_resolutions()
    return list(data.get("resolutions", {}).values())

def get_resolution(id: str) -> Optional[Dict[str, Any]]:
    data = _load_resolutions()
    return data.get("resolutions", {}).get(id)

def create_resolution(data: Dict[str, Any]) -> Dict[str, Any]:
    stored = _load_resolutions()
    res_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    
    res = {
        'id': res_id,
        'title': data.get('title', ''),
        'description': data.get('description', ''),
        'theme_id': data.get('theme_id', ''),
        'severity': data.get('severity', 'medium'),
        'status': data.get('status', 'detected'),
        'assigned_to': data.get('assigned_to', ''),
        'detected_at': now,
        'resolved_at': None,
        'fix_description': data.get('fix_description', ''),
        'fix_version': data.get('fix_version', ''),
        'linked_evidence': data.get('linked_evidence', []),
        'before_avg_rating': None,
        'after_avg_rating': None,
        'feedback_count_before': len(data.get('linked_evidence', [])),
        'feedback_count_after': 0,
        'verification_status': 'pending',
        'notes': data.get('notes', ''),
        'updated_at': now
    }
    
    if 'resolutions' not in stored:
        stored['resolutions'] = {}
    stored['resolutions'][res_id] = res
    _save_resolutions(stored)
    return res

def update_resolution(id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    stored = _load_resolutions()
    if 'resolutions' not in stored or id not in stored['resolutions']:
        return None
        
    res = stored['resolutions'][id]
    old_status = res.get('status')
    
    # Update fields
    for k, v in data.items():
        if k in ['id', 'detected_at']: # protected fields
            continue
        res[k] = v
        
    new_status = res.get('status')
    now = datetime.utcnow().isoformat() + "Z"
    res['updated_at'] = now
    
    # Compute before_avg_rating if status changed to resolved
    if new_status == 'resolved' and old_status != 'resolved':
        res['resolved_at'] = now
        linked = set(res.get('linked_evidence', []))
        if linked:
            mems = _get_memories()
            ratings = []
            for m in mems:
                if m.get('id') in linked:
                    rating = int(m.get('metadata', {}).get('rating', 0))
                    if rating > 0:
                        ratings.append(rating)
            if ratings:
                res['before_avg_rating'] = sum(ratings) / len(ratings)
                
    stored['resolutions'][id] = res
    _save_resolutions(stored)
    return res

def delete_resolution(id: str) -> bool:
    stored = _load_resolutions()
    if 'resolutions' in stored and id in stored['resolutions']:
        del stored['resolutions'][id]
        _save_resolutions(stored)
        return True
    return False

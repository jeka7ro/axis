import json
import os
from typing import Dict, Optional

_CAEN_CACHE: Dict[str, Dict] = {}

def load_caen_database() -> Dict[str, Dict]:
    global _CAEN_CACHE
    if not _CAEN_CACHE:
        try:
            curr_dir = os.path.dirname(os.path.abspath(__file__))
            json_path = os.path.join(curr_dir, "..", "..", "data", "caen_codes.json")
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    _CAEN_CACHE = json.load(f)
        except Exception as e:
            print(f"Eroare încărcare caen_codes.json: {e}")
    return _CAEN_CACHE

def get_caen_details(cod_caen: Optional[str]) -> Dict[str, str]:
    if not cod_caen:
        return {}
    clean = "".join(filter(str.isdigit, str(cod_caen)))
    db = load_caen_database()
    if clean in db:
        return db[clean]
    padded = clean.zfill(4) if clean else ""
    if padded in db:
        return db[padded]
    return {
        "cod": clean,
        "denumire": "",
        "sectiune": "",
        "diviziune": "",
        "grupa": ""
    }

def get_caen_description(cod_caen: Optional[str]) -> str:
    det = get_caen_details(cod_caen)
    return det.get("denumire", "")

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from ..database import get_db
from ..services.axis_agent import AxisAgentService

router = APIRouter(prefix="/api/assistant", tags=["Axis AI Copilot"])

class ChatRequest(BaseModel):
    query: str
    client_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None

import re

EMOJI_REGEX = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\ufe0f\u200d]')

def strip_emojis_recursive(val: Any) -> Any:
    if isinstance(val, str):
        cleaned = EMOJI_REGEX.sub('', val)
        return re.sub(r'[ \t]{2,}', ' ', cleaned)
    elif isinstance(val, dict):
        return {k: strip_emojis_recursive(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [strip_emojis_recursive(i) for i in val]
    return val

@router.post("/chat")
async def chat_with_copilot(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint pentru dialog cu Asistentul AI Axis Copilot:
    - Analiză faptică clienți
    - Verificare live CUI extern (ANAF, ONRC, BPI, Just.ro)
    - Răspunsuri la întrebări de eligibilitate și creditare
    - Declansare comenzi de navigare în aplicație
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Mesajul nu poate fi gol.")

    ctx = req.context or {}
    if req.client_id and "client_id" not in ctx:
        ctx["client_id"] = req.client_id

    try:
        response = await AxisAgentService.process_user_query(
            query=req.query,
            context=ctx,
            db=db
        )
        return strip_emojis_recursive(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "reply": f"A intervenit o eroare la procesarea interogării: {str(e)}",
            "intent": "ERROR",
            "actions": []
        }


@router.get("/suggested-prompts")
def get_suggested_prompts(client_id: Optional[int] = None):
    """Returnează sugestii rapide de întrebări în funcție de ecranul activ"""
    if client_id:
        return {
            "prompts": [
                "Ce profit și cifră de afaceri a avut?",
                "Are dosare de insolvență sau procese?",
                "Cine este beneficiarul real (UBO)?",
                "Se califică firma pentru leasing?",
                "Deschide auditul BPI & PulsPlăți"
            ]
        }
    return {
        "prompts": [
            "Verifică CUI 28396216",
            "Calculează rata la 25000 euro pe 36 luni",
            "Ce mașini avem disponibile?",
            "Cum se deduce TVA-ul la leasing?",
            "Explică-mi criteriile de scoring"
        ]
    }

class AIConfigPayload(BaseModel):
    api_key: Optional[str] = None
    provider: Optional[str] = "groq"

@router.get("/config")
def get_ai_config():
    """Returnează starea configurării motorului AI"""
    import os
    groq = bool(os.getenv("GROQ_API_KEY"))
    openai = bool(os.getenv("OPENAI_API_KEY"))
    gemini = bool(os.getenv("GEMINI_API_KEY"))
    active_provider = "groq" if groq else ("openai" if openai else ("gemini" if gemini else "offline"))
    return {
        "configured": groq or openai or gemini,
        "active_provider": active_provider,
        "providers": {
            "groq": {"name": "Groq (LLaMA 3.3 70B)", "configured": groq, "free": True, "url": "https://console.groq.com/keys"},
            "openai": {"name": "OpenAI (GPT-4o)", "configured": openai, "free": False, "url": "https://platform.openai.com/api-keys"},
            "gemini": {"name": "Google Gemini (1.5 Flash)", "configured": gemini, "free": True, "url": "https://aistudio.google.com/app/apikey"},
            "offline": {"name": "Motor Faptic Axis (Determinist & Matematic)", "configured": True, "free": True}
        }
    }

@router.post("/config")
def update_ai_config(payload: AIConfigPayload):
    """Permite salvarea unei chei API direct în mediul de rulare și în backend/.env"""
    import os
    key = (payload.api_key or "").strip()
    provider = (payload.provider or "groq").lower()
    
    env_var = "GROQ_API_KEY" if provider == "groq" else ("OPENAI_API_KEY" if provider == "openai" else "GEMINI_API_KEY")
    if key:
        os.environ[env_var] = key
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            lines = []
            found = False
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        if line.startswith(f"{env_var}="):
                            lines.append(f"{env_var}={key}\n")
                            found = True
                        else:
                            lines.append(line)
            if not found:
                lines.append(f"{env_var}={key}\n")
            with open(env_path, "w") as f:
                f.writelines(lines)
        except Exception as e:
            print(f"[SaveEnv] Err: {e}")
            
    return {"status": "ok", "provider": provider, "configured": bool(key)}


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.client import Client, Evaluation
from ..schemas.client import ClientCreate, ClientResponse, ClientDetailResponse, EvaluationResponse
from ..services.ai_engine import AIEngineService

router = APIRouter(prefix="/api/clients", tags=["Clients"])

# --- AUTH BYPASS FOR LOCAL DEV (So the UI doesn't break due to missing JWT) ---
class MockUser:
    id = 1

def mock_get_current_user():
    return MockUser()
# -----------------------------------------------------------------------------

@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    # Check if CUI already exists
    db_client = db.query(Client).filter(Client.cui_cnp == client.cui_cnp).first()
    if db_client:
        raise HTTPException(status_code=400, detail="Client with this CUI/CNP already exists")
    
    new_client = Client(**client.model_dump())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client: ClientCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
        
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/", response_model=List[ClientResponse])
def get_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    clients = db.query(Client).order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    
    # Attach latest score dynamically for the response
    for client in clients:
        latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
        if latest_eval:
            setattr(client, "latest_score", latest_eval.score)
            setattr(client, "latest_risk_level", latest_eval.risk_level)
            
    return clients

from ..services.osint.anaf_scraper import AnafScraper
from ..services.osint.registry_scraper import RegistryScraper
from ..services.osint.cross_checker import CrossChecker

@router.get("/lookup/{cui}")
async def lookup_client_by_cui(cui: str, current_user = Depends(mock_get_current_user)):
    """Fetches company name from ANAF for auto-fill in the UI"""
    scraper = AnafScraper()
    data = await scraper.fetch_company_data(cui)
    return {
        "name": data.get("nume", ""),
        "address": data.get("adresa", ""),
        "reg_com": data.get("reg_com", "")
    }

@router.get("/{client_id}", response_model=ClientDetailResponse)
def get_client(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

from ..services.osint.anaf_scraper import AnafScraper
from ..services.osint.registry_scraper import RegistryScraper
from ..services.osint.cross_checker import CrossChecker

@router.post("/{client_id}/evaluate", response_model=EvaluationResponse)
async def evaluate_client(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    # 1. OSINT Data Collection (Caracatița)
    anaf_scraper = AnafScraper()
    registry_scraper = RegistryScraper()
    cross_checker = CrossChecker()
    
    anaf_data = await anaf_scraper.fetch_company_data(client.cui_cnp)
    personnel_data = await registry_scraper.fetch_company_personnel(client.cui_cnp)
    balance_data = await registry_scraper.fetch_company_balance(client.cui_cnp)
    
    # 2. Cross Check
    osint_data = cross_checker.evaluate_risk(anaf_data, personnel_data, balance_data)
        
    # 3. Call AI Engine
    ai_result = AIEngineService.evaluate_client(name=client.name, osint_data=osint_data)
    
    # 4. Save evaluation
    new_evaluation = Evaluation(
        client_id=client.id,
        score=ai_result["score"],
        risk_level=ai_result["risk_level"],
        ai_summary=ai_result["ai_summary"],
        raw_financial_data=ai_result["raw_financial_data"],
        created_by_user_id=current_user.id
    )
    
    db.add(new_evaluation)
    db.commit()
    db.refresh(new_evaluation)
    
    return new_evaluation

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.campaign import Campaign
from ..schemas.campaign import CampaignCreate, CampaignResponse
from ..api.auth import get_current_user

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])

def seed_default_campaigns(db: Session):
    count = db.query(Campaign).count()
    if count == 0:
        defaults = [
            Campaign(
                name="Campanie Națională Dobândă Subvenționată 3.9%",
                dealer_name="Toți Dealerii Autorizați",
                discounted_interest_rate=3.9,
                standard_interest_rate=5.9,
                min_advance_percent=15.0,
                max_period_months=60,
                subsidized_by="Axis Mobility & Rețeaua Parteneri",
                description="Dobândă redusă cu 2% subvenționată pentru contracte de leasing operațional de minim 36 de luni.",
                is_active=True
            ),
            Campaign(
                name="Promoție Specială Mercedes-Benz & BMW (4.2%)",
                dealer_name="Autoklass & Automobile Bavaria",
                discounted_interest_rate=4.2,
                standard_interest_rate=5.9,
                min_advance_percent=20.0,
                max_period_months=48,
                subsidized_by="Dealer Partner Exclusive",
                description="Subvenție de dobândă dedicată gamei premium Mercedes-Benz și BMW pentru clienți PJ eligibili.",
                is_active=True
            ),
            Campaign(
                name="Eco Fleet Electric & Hybrid (2.9%)",
                dealer_name="Rețeaua Națională",
                discounted_interest_rate=2.9,
                standard_interest_rate=5.9,
                min_advance_percent=10.0,
                max_period_months=60,
                subsidized_by="Fondul Verde Axis",
                description="Cea mai avantajoasă rată din piață pentru tranziția flotelor către vehicule hibride și electrice.",
                is_active=True
            )
        ]
        for c in defaults:
            db.add(c)
        db.commit()

@router.get("/", response_model=List[CampaignResponse])
@router.get("", response_model=List[CampaignResponse])
def get_campaigns(
    active_only: bool = False,
    dealer: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_default_campaigns(db)
    query = db.query(Campaign)
    if active_only:
        query = query.filter(Campaign.is_active == True)
    if dealer:
        query = query.filter((Campaign.dealer_name == dealer) | (Campaign.dealer_name.contains("Toți")))
    return query.order_by(Campaign.created_at.desc()).all()

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campania nu a fost găsită")
    return c

@router.post("/", response_model=CampaignResponse)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    camp = Campaign(**data.model_dump())
    db.add(camp)
    db.commit()
    db.refresh(camp)
    return camp

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: int, data: CampaignCreate, db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campania nu a fost găsită")
    for key, val in data.model_dump().items():
        setattr(camp, key, val)
    db.commit()
    db.refresh(camp)
    return camp

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campania nu a fost găsită")
    db.delete(camp)
    db.commit()
    return {"message": "Campania a fost ștearsă cu succes"}

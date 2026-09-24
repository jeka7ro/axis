from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .api import auth, clients, offers, gps, vehicles, nomenclatures, campaigns
import os

# Create database tables (wrapped to survive Postgres enum conflicts)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[STARTUP] create_all warning: {e}")

# Auto-migrate missing columns for existing databases (e.g. Railway Postgres)
from sqlalchemy import text
try:
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE axis_clients ADD COLUMN representative_cnp VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE axis_clients ADD COLUMN representative_address VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE axis_clients ADD COLUMN profile_photo VARCHAR;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE axis_offers ADD COLUMN vehicle_id INTEGER;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE axis_evaluations ALTER COLUMN created_by_user_id DROP NOT NULL;"))
        except Exception:
            pass
        # Auto-migrate Fidejusor, Dealer, Campaign, and eSign fields
        for tbl, col, ctype in [
            ("axis_offers", "template_type", "VARCHAR"),
            ("axis_offers", "currency", "VARCHAR"),
            ("axis_offers", "dealer_name", "VARCHAR"),
            ("axis_offers", "created_by_role", "VARCHAR"),
            ("axis_offers", "campaign_id", "INTEGER"),
            ("axis_offers", "campaign_name", "VARCHAR"),
            ("axis_offers", "fidejusor_name", "VARCHAR"),
            ("axis_offers", "fidejusor_cnp", "VARCHAR"),
            ("axis_offers", "fidejusor_address", "VARCHAR"),
            ("axis_offers", "fidejusor_id_card", "VARCHAR"),
            ("axis_offers", "fidejusor_quality", "VARCHAR"),
            ("axis_contracts", "template_type", "VARCHAR"),
            ("axis_contracts", "esign_envelope_id", "VARCHAR"),
            ("axis_contracts", "esign_audit_log", "TEXT"),
            ("axis_contracts", "fidejusor_name", "VARCHAR"),
            ("axis_contracts", "fidejusor_cnp", "VARCHAR"),
            ("axis_contracts", "fidejusor_address", "VARCHAR"),
            ("axis_contracts", "fidejusor_id_card", "VARCHAR"),
            ("axis_contracts", "fidejusor_quality", "VARCHAR"),
            ("axis_vehicles", "fleet_type", "VARCHAR"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {ctype};"))
            except Exception:
                pass
        try:
            conn.execute(text("""
                INSERT INTO axis_users (id, email, hashed_password, full_name, role, is_active)
                VALUES (1, 'admin@axis.ro', 'mock', 'Eugeniu Cazmal', 'super_admin', true)
                ON CONFLICT (id) DO NOTHING;
            """))
        except Exception:
            pass
except Exception as e:
    print(f"Auto-migration skipped: {e}")

app = FastAPI(
    title="Axis AI Platform API",
    description="Backend API for Axis Fleet and Leasing Management",
    version="1.0.0",
)

# Global exception handler — guarantees JSON + CORS headers on ALL unhandled errors
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    origin = request.headers.get("origin", "*")
    response = JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}", "error": True}
    )
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Custom CORS middleware to guarantee CORS headers on all responses, including OPTIONS preflight and 500 errors
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method == "OPTIONS":
        res = JSONResponse(content={"status": "ok"})
    else:
        try:
            res = await call_next(request)
        except Exception as e:
            import traceback
            traceback.print_exc()
            res = JSONResponse(status_code=500, content={"detail": str(e), "error": True})
    
    if origin:
        res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Methods"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "*"
        res.headers["Access-Control-Expose-Headers"] = "*"
    return res

# Mount documents folder
os.makedirs("documents", exist_ok=True)
app.mount("/documents", StaticFiles(directory="documents"), name="documents")

# CORS configuration - Allow Netlify, local dev, and any production client
origins = [
    "https://axis-v01.netlify.app",
    "https://axisrent.ro",
    "http://localhost:1987",
    "http://127.0.0.1:1987",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(offers.router)
app.include_router(gps.router)
app.include_router(vehicles.router)
app.include_router(nomenclatures.router)
app.include_router(campaigns.router)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.get("/")
def root():
    return {"message": "Welcome to Axis AI Platform API", "version": "2.5.1-cors-fix"}

@app.get("/health")
def health_check():
    """Endpoint de verificare stare pentru monitorizare VPS IOSS și uptime checks"""
    return {
        "status": "healthy",
        "service": "axis-ai-platform",
        "version": "2.5.1",
        "database": "connected"
    }

@app.get("/api/debug/test-error")
async def test_error():
    """Endpoint de diagnostic — testează dacă global exception handler returnează JSON + CORS"""
    raise ValueError("Test error — dacă vezi acest mesaj în JSON cu CORS headers, exception handler-ul funcționează!")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .api import auth, clients, offers, gps, vehicles, nomenclatures
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Axis AI Platform API",
    description="Backend API for Axis Fleet and Leasing Management",
    version="1.0.0",
)

# Mount documents folder
os.makedirs("documents", exist_ok=True)
app.mount("/documents", StaticFiles(directory="documents"), name="documents")

# CORS configuration - Allow all for local dev to support any Vite port
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

@app.get("/")
def root():
    return {"message": "Welcome to Axis AI Platform API"}

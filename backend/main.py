from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db
from dotenv import load_dotenv
from routers import complaints, officers
from services.escalation import escalation_engine
import asyncio
import os
from contextlib import asynccontextmanager

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the escalation engine as a background task
    task = asyncio.create_task(escalation_engine())
    yield
    # Cancel task on shutdown
    task.cancel()

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Civic Issue Tracker API", lifespan=lifespan)

# Mount uploads directory for static access
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

import sys
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from fastapi import Request

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = request.url.path
    print(f"\n[HTTP IN]  --> [{method}] {path}", flush=True)
    try:
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)
        print(f"[HTTP OUT] <-- [{method}] {path} -> {response.status_code} ({duration}ms)\n", flush=True)
        return response
    except Exception as exc:
        duration = round((time.time() - start_time) * 1000, 2)
        print(f"[HTTP ERR] <-- [{method}] {path} -> ERROR: {exc} ({duration}ms)\n", flush=True)
        raise exc

app.include_router(complaints.router, tags=["Citizens"])
app.include_router(officers.router, tags=["Officers"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Civic Issue Tracker API is running"}

from services.sms_service import send_sms

@app.get("/sms/test")
@app.post("/sms/test")
def test_sms(to: str = "+919609903555", message: str = "Civic Issue Tracker: Test SMS notification via Twilio!"):
    success = send_sms(to, message)
    return {
        "success": success,
        "to": to,
        "message": message,
        "provider": "Twilio" if os.getenv("ENABLE_TWILIO_SMS", "true").lower() == "true" else "Mock"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mock_db_active": db.use_mock
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

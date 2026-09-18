from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db
from dotenv import load_dotenv
from routers import complaints, officers
from services.escalation import escalation_engine
import asyncio
from contextlib import asynccontextmanager

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the escalation engine as a background task
    task = asyncio.create_task(escalation_engine())
    yield
    # Cancel task on shutdown
    task.cancel()

app = FastAPI(title="Civic Issue Tracker API", lifespan=lifespan)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router, tags=["Citizens"])
app.include_router(officers.router, tags=["Officers"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Civic Issue Tracker API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mock_db_active": db.use_mock
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

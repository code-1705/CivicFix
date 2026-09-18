from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Civic Issue Tracker API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

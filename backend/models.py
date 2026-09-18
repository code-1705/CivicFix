from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    wardNo: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    wardNo: str

class ComplaintResponse(BaseModel):
    complaint_id: str
    status: str

class ResolutionRequest(BaseModel):
    lat: float
    lng: float
    # Note: image will be handled as UploadFile in FastAPI, so it's not strictly part of this BaseModel body if we use multipart

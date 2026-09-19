import os
import uuid
from typing import Tuple
from dotenv import load_dotenv

load_dotenv()

USE_S3 = os.getenv("USE_S3", "false").lower() == "true"
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StorageService:
    def __init__(self):
        self.use_s3 = USE_S3 and bool(S3_BUCKET_NAME)
        self.s3_client = None
        if self.use_s3:
            try:
                import boto3
                self.s3_client = boto3.client("s3", region_name=AWS_REGION)
                print(f"[*] S3 Storage enabled. Target bucket: {S3_BUCKET_NAME}", flush=True)
            except Exception as e:
                print(f"[!] Failed to initialize S3 client: {e}. Falling back to local storage.", flush=True)
                self.use_s3 = False
        else:
            print("[*] Local filesystem storage active (/uploads).", flush=True)

    def save_file(self, content: bytes, original_filename: str, prefix: str = "") -> Tuple[str, str]:
        """
        Saves file to AWS S3 or local uploads directory.
        Returns: (public_url, local_path)
        """
        ext = os.path.splitext(original_filename or "")[1] or ".jpg"
        unique_name = f"{prefix}{uuid.uuid4().hex[:10]}{ext}"
        local_path = os.path.join(UPLOAD_DIR, unique_name)

        # Always maintain local file for local vision triage / cache
        try:
            with open(local_path, "wb") as f:
                f.write(content)
        except Exception as e:
            print(f"[!] Error writing local file cache: {e}", flush=True)

        if self.use_s3 and self.s3_client:
            content_type = "image/jpeg"
            if ext.lower() == ".png":
                content_type = "image/png"
            elif ext.lower() == ".webp":
                content_type = "image/webp"

            key = f"uploads/{unique_name}"
            try:
                self.s3_client.put_object(
                    Bucket=S3_BUCKET_NAME,
                    Key=key,
                    Body=content,
                    ContentType=content_type
                )
                public_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
                return public_url, local_path
            except Exception as e:
                print(f"[!] Failed to upload to S3: {e}. Using local URL.", flush=True)
                return f"/uploads/{unique_name}", local_path

        return f"/uploads/{unique_name}", local_path

storage_service = StorageService()

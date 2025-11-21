from fastapi import FastAPI
from app.api.v1 import cv  # import CV router

app = FastAPI(title="Headhunter API")

# Include the CV router
app.include_router(cv.router)

@app.get("/")
def root():
    return {"status": "Headhunter backend running"}
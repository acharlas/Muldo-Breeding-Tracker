from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.seed import router as seed_router

app = FastAPI(title="Muldo Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seed_router)


@app.get("/")
async def root():
    return {"status": "ok"}

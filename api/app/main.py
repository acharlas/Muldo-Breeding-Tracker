from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.seed import router as seed_router
from app.routers.inventory import router as inventory_router
from app.routers.breeding import router as breeding_router
from app.routers.cascade import router as cascade_router
from app.routers.planner import router as planner_router

app = FastAPI(title="Muldo Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(seed_router)
app.include_router(inventory_router)
app.include_router(breeding_router)
app.include_router(cascade_router)
app.include_router(planner_router)


@app.get("/")
async def root():
    return {"status": "ok"}

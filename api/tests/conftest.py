import pytest
from sqlalchemy import text
from app.database import engine, AsyncSessionLocal


@pytest.fixture(autouse=True)
async def isolate_db():
    """Truncate transactional tables before each test and dispose the engine after.

    muldo_species and breeding_recipe are seed-only tables shared across tests;
    they are NOT truncated. muldo_individual, breeding_log, and clone_log contain
    per-test state and are cleared to prevent cross-test contamination.
    """
    async with AsyncSessionLocal() as session:
        await session.execute(text(
            "TRUNCATE TABLE progression_snapshot, clone_log, breeding_log, muldo_individual RESTART IDENTITY CASCADE"
        ))
        await session.commit()

    yield

    await engine.dispose()

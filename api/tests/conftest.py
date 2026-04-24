import pytest
from app.database import engine


@pytest.fixture(autouse=True)
async def dispose_engine():
    """Dispose the SQLAlchemy engine connection pool after each test.

    This prevents asyncpg from raising 'another operation is in progress'
    errors when the same connection is reused across test functions.
    """
    yield
    await engine.dispose()

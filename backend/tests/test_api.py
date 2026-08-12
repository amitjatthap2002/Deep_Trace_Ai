import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the DeepTrace AI API", "docs": "/api/docs"}

@pytest.mark.asyncio
async def test_health_check_unauthorized():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/admin/system-health")
    # Should be 401 because no token is provided
    assert response.status_code == 401

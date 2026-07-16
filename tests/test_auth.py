from fastapi.responses import PlainTextResponse
from starlette.requests import Request
from starlette.testclient import TestClient

import app.main as main
from app.main import AuthMiddleware, has_valid_api_token


def test_valid_bearer_token_is_accepted():
    assert has_valid_api_token([(b"authorization", b"Bearer native-token")], "native-token")


def test_invalid_or_missing_bearer_token_is_rejected():
    assert not has_valid_api_token([], "native-token")
    assert not has_valid_api_token([(b"authorization", b"Bearer wrong")], "native-token")
    assert not has_valid_api_token([(b"authorization", b"Basic native-token")], "native-token")


def test_token_only_middleware_protects_api_and_exposes_health(monkeypatch):
    async def endpoint(scope, receive, send):
        await PlainTextResponse("ok")(scope, receive, send)

    monkeypatch.setattr(main, "VIEWER_PASSWORD", "")
    monkeypatch.setattr(main, "VIEWER_API_TOKEN", "native-token")
    client = TestClient(AuthMiddleware(endpoint))

    assert client.get("/api/info").status_code == 401
    assert client.get("/api/info", headers={"Authorization": "Bearer native-token"}).status_code == 200
    assert client.get("/health").status_code == 200


def test_api_info_declares_native_capabilities(monkeypatch):
    monkeypatch.setattr(main, "VIEWER_PASSWORD", "web-password")
    monkeypatch.setattr(main, "VIEWER_API_TOKEN", "native-token")

    info = main.api_info()
    assert info["apiVersion"] == 1
    assert info["auth"] == {"session": True, "bearer": True}
    assert "sharedState" in info["features"]


def test_logout_clears_private_offline_browser_data(monkeypatch):
    monkeypatch.setattr(main, "VIEWER_PASSWORD", "web-password")
    session = {"logged_in": True}
    request = Request({"type": "http", "method": "GET", "path": "/logout", "headers": [], "session": session})
    response = main.logout(request)
    body = response.body.decode("utf-8")

    assert response.status_code == 200
    assert session == {}
    assert response.headers["cache-control"] == "no-store"
    assert "caches.delete('eagle-viewer-thumbs-v1')" in body
    assert "caches.delete('eagle-viewer-api-v1')" in body
    assert "localStorage.removeItem(key)" in body
    assert "window.location.replace('/login')" in body

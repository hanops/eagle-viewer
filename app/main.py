import logging
import hmac
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Form
from fastapi.responses import FileResponse, Response, RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.types import ASGIApp

from app.config import VIEWER_API_TOKEN, VIEWER_PASSWORD, VIEWER_SECRET_KEY
from app.api.folders import router as folders_router
from app.api.items import router as items_router
from app.vault import APP_VERSION, load_vault, get_cache_stats, get_library_status

logger = logging.getLogger(__name__)


def has_valid_api_token(headers: list[tuple[bytes, bytes]], token: str) -> bool:
    """Constant-time validation for an optional API-client Bearer token."""
    if not token:
        return False
    authorization = dict(headers).get(b"authorization", b"").decode("latin-1")
    return authorization.startswith("Bearer ") and hmac.compare_digest(authorization[7:], token)


class AuthMiddleware:
    """未设置密码时放行；设置了密码则校验 session，未登录时 API 返回 401、页面重定向到 /login。"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        if path == "/health":
            await self.app(scope, receive, send)
            return
        if path.startswith("/api/") and has_valid_api_token(scope.get("headers") or [], VIEWER_API_TOKEN):
            await self.app(scope, receive, send)
            return
        if not VIEWER_PASSWORD:
            if path.startswith("/api/") and VIEWER_API_TOKEN:
                from starlette.responses import Response
                response = Response(status_code=401, content="Unauthorized")
                await response(scope, receive, send)
                return
            await self.app(scope, receive, send)
            return
        if path == "/login":
            await self.app(scope, receive, send)
            return
        # Session 由 SessionMiddleware 填充，需在 Auth 之前执行
        session = scope.get("session") or {}
        if session.get("logged_in"):
            await self.app(scope, receive, send)
            return
        if path.startswith("/api/"):
            from starlette.responses import Response
            response = Response(status_code=401, content="Unauthorized")
            await response(scope, receive, send)
            return
        from starlette.responses import RedirectResponse
        response = RedirectResponse(url="/login", status_code=302)
        await response(scope, receive, send)
        return


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        load_vault()
    except Exception:
        logger.exception("Failed to preload Eagle vault on startup")
    yield


app = FastAPI(title="Eagle Vault Viewer", description="Read-only viewer for Eagle library on NAS", lifespan=lifespan)

# 先加 Session，后加 Auth：请求时先执行 Session（解码 cookie 写入 scope），再执行 Auth（校验）
if VIEWER_PASSWORD or VIEWER_API_TOKEN:
    app.add_middleware(AuthMiddleware)
if VIEWER_PASSWORD:
    app.add_middleware(SessionMiddleware, secret_key=VIEWER_SECRET_KEY or "eagle-viewer-session")

app.include_router(folders_router)
app.include_router(items_router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/info")
def api_info():
    return {
        "name": "Eagle Vault Viewer",
        "version": APP_VERSION,
        "apiVersion": 1,
        "features": ["browse", "search", "preview", "download", "batchDownload", "bearerAuth", "protectedFolders"],
        "auth": {"session": bool(VIEWER_PASSWORD), "bearer": bool(VIEWER_API_TOKEN)},
    }

@app.post("/api/library/reload")
def reload_library():
    load_vault()
    return {"ok": True, "stats": get_cache_stats(), "status": get_library_status(deep=False)}


@app.get("/api/library/status")
def library_status(deep: bool = False):
    return get_library_status(deep=deep)

# Serve frontend at / (API routes under /api take precedence)
web_dir = Path(__file__).parent / "web"
_index_path = web_dir / "index.html"
_login_path = web_dir / "login.html"
_manifest_path = web_dir / "manifest.json"
_sw_path = web_dir / "sw.js"
_mobile_path = web_dir / "mobile.html"

app.mount("/static", StaticFiles(directory=web_dir, html=False), name="static")


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, error: str = ""):
    """登录页。"""
    if not VIEWER_PASSWORD:
        return RedirectResponse(url="/", status_code=302)
    if request.session.get("logged_in"):
        return RedirectResponse(url="/", status_code=302)
    if not _login_path.exists():
        return HTMLResponse("<h1>Login</h1><p>login.html not found</p>", status_code=500)
    html = _login_path.read_text(encoding="utf-8")
    error_html = '<p class="error">密码错误，请重试</p>' if error else ""
    html = html.replace("__ERROR_HTML__", error_html)
    return HTMLResponse(html)


@app.post("/login")
def login_submit(request: Request, password: str = Form(default="")):
    """校验密码并写入 session，成功后跳转首页。"""
    if not VIEWER_PASSWORD:
        return RedirectResponse(url="/", status_code=302)
    if password == VIEWER_PASSWORD:
        request.session["logged_in"] = True
        return RedirectResponse(url="/", status_code=302)
    return RedirectResponse(url="/login?error=1", status_code=302)


@app.get("/")
def index():
    if _index_path.exists():
        return FileResponse(_index_path)
    return {"message": "Eagle Vault Viewer API", "docs": "/docs"}


@app.get("/index.html")
def index_html():
    if _index_path.exists():
        return FileResponse(_index_path)
    return {"message": "Eagle Vault Viewer API", "docs": "/docs"}


@app.get("/manifest.json")
def manifest():
    if _manifest_path.exists():
        return FileResponse(_manifest_path, media_type="application/json")
    return {"name": "Eagle Vault Viewer", "start_url": "/", "display": "standalone"}


@app.get("/sw.js")
def sw():
    if _sw_path.exists():
        return FileResponse(_sw_path, media_type="application/javascript")
    return Response(content="", media_type="application/javascript")


@app.get("/mobile.html")
def mobile_page():
    if _mobile_path.exists():
        return FileResponse(_mobile_path, media_type="text/html")
    return RedirectResponse(url="/", status_code=302)

import asyncio
import logging
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import api, tools
from app.core.config import Settings, get_settings
from app.core.db import Database
from app.moe.routes import router as moe_router, tools as moe_tools
from app.moe.voice import MoeVoiceRooms
from app.services.errors import ServiceError
from app.services.interviews import LiveAgents

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.check_production()
    for name in ("httpx", "httpcore", "agora", "agora_agent"):
        logging.getLogger(name).setLevel(logging.WARNING)  # corpos HTTP podem conter tokens

    database = Database(settings.database_url)
    database.create_all()
    live = LiveAgents()
    moe_voice = MoeVoiceRooms()

    @asynccontextmanager
    async def lifespan(_):
        async def reaper():
            from app.services.interviews import InterviewService
            while True:
                await asyncio.sleep(5)
                try:
                    with database.sessions() as session:
                        await InterviewService(session, settings, live).reap()
                except Exception:
                    logging.getLogger(__name__).exception("Falha ao fechar tentativas sem sinal")
                try:
                    await moe_voice.reap()
                except Exception:
                    logging.getLogger(__name__).exception("Falha ao fechar salas de voz do MOE")
        task = asyncio.create_task(reaper())
        yield
        task.cancel()
        await live.stop_all()
        await moe_voice.stop_all()

    app = FastAPI(title="Pontos Fortes API", version="0.1.0", lifespan=lifespan,
                  docs_url=None if settings.env == "prod" else "/api/docs", openapi_url=None if settings.env == "prod" else "/api/openapi.json")
    app.state.settings, app.state.db, app.state.live = settings, database, live
    app.state.moe_voice = moe_voice
    public = urlsplit(settings.public_url)
    allowed = {f"{public.scheme}://{public.netloc}", "http://localhost:3000", "http://127.0.0.1:3000"} \
        if settings.env != "prod" else {f"{public.scheme}://{public.netloc}"}

    @app.middleware("http")
    async def guard(request: Request, call_next):
        # Cookie de sessão + checagem de Origem nas escritas bloqueia CSRF entre sites.
        path = request.url.path
        if path.startswith("/api/v1/") and request.method not in SAFE_METHODS and path != "/api/v1/billing/webhook":
            origin = request.headers.get("origin")
            if origin and origin.rstrip("/") not in allowed:
                return JSONResponse(status_code=403, content={"detail": "Origem não autorizada."})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(ServiceError)
    async def service_error(_: Request, exc: ServiceError):
        return JSONResponse(status_code=exc.status, content={"detail": exc.message})

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, exc: RequestValidationError):
        fields = sorted({str(e["loc"][-1]) for e in exc.errors() if e.get("loc")})
        return JSONResponse(status_code=422, content={"detail": "Confira os campos: " + ", ".join(fields) + ".",
                                                      "fields": fields})

    app.include_router(api)
    app.include_router(tools)
    app.include_router(moe_router)
    app.include_router(moe_tools)
    return app


app = create_app()

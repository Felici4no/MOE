from fastapi import APIRouter, Request, Response
from fastapi.concurrency import run_in_threadpool

from app.api.deps import DbDep, SettingsDep, UserDep

from .schemas import AnswerIn, PersonaIn, PersonaOut, PointIn, PointOut, ScenarioIn, ScenarioOut, ShareIn, StartIn
from .service import MoeAdmin, MoePlayer
from .voice import MoeVoice, require_room, silent_completion

router = APIRouter(prefix="/api/v1/moe", tags=["moe"])
tools = APIRouter(prefix="/api/tools/moe", tags=["moe"])


def _voice(request: Request) -> MoeVoice:
    return MoeVoice(request.app.state.settings, request.app.state.moe_voice)


# --- Empresa: configuração ------------------------------------------------------
@router.get("/catalog")
def catalog(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).catalog()


@router.get("/points", response_model=list[PointOut])
def points(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).list_points()


@router.post("/points", response_model=PointOut, status_code=201)
def create_point(data: PointIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_point(data)


@router.put("/points/{pid}", response_model=PointOut)
def update_point(pid: str, data: PointIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_point(data, pid)


@router.delete("/points/{pid}", status_code=204)
def delete_point(pid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    MoeAdmin(db, cfg, user).delete_point(pid)
    return Response(status_code=204)


@router.get("/personas", response_model=list[PersonaOut])
def personas(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).list_personas()


@router.post("/personas", response_model=PersonaOut, status_code=201)
def create_persona(data: PersonaIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_persona(data)


@router.put("/personas/{pid}", response_model=PersonaOut)
def update_persona(pid: str, data: PersonaIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_persona(data, pid)


@router.delete("/personas/{pid}", status_code=204)
def delete_persona(pid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    MoeAdmin(db, cfg, user).delete_persona(pid)
    return Response(status_code=204)


@router.get("/scenarios", response_model=list[ScenarioOut])
def scenarios(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).list_scenarios()


@router.post("/scenarios", response_model=ScenarioOut, status_code=201)
def create_scenario(data: ScenarioIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_scenario(data)


@router.post("/scenarios/from-template", response_model=ScenarioOut, status_code=201)
def scenario_from_template(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).from_template()


@router.get("/scenarios/{sid}", response_model=ScenarioOut)
def get_scenario(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).get_scenario(sid)


@router.put("/scenarios/{sid}", response_model=ScenarioOut)
def update_scenario(sid: str, data: ScenarioIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).save_scenario(data, sid)


@router.post("/scenarios/{sid}/publish", response_model=ScenarioOut)
def publish(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).publish(sid)


@router.post("/scenarios/{sid}/unpublish", response_model=ScenarioOut)
def unpublish(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoeAdmin(db, cfg, user).unpublish(sid)


@router.delete("/scenarios/{sid}", status_code=204)
def delete_scenario(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    MoeAdmin(db, cfg, user).delete_scenario(sid)
    return Response(status_code=204)


@router.get("/results")
def results(user: UserDep, db: DbDep, cfg: SettingsDep):
    """Apenas sessões que a própria pessoa compartilhou (e sem alerta de bem-estar)."""
    return MoeAdmin(db, cfg, user).results()


# --- Participante -----------------------------------------------------------------
@router.get("/play/scenarios")
def available(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).available()


@router.get("/play/sessions")
def my_sessions(user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).mine()


@router.post("/play/sessions", status_code=201)
def start(data: StartIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).start(data.scenario_id)


@router.get("/play/sessions/{sid}")
def session(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).get(sid)


@router.post("/play/sessions/{sid}/answers")
async def answer(sid: str, data: AnswerIn, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    """Mesma resposta por texto ou por voz. Com voz ativa, a próxima fala sai pela voz do personagem."""
    player = MoePlayer(db, cfg, user)
    view = await run_in_threadpool(player.answer, sid, data.scene_id, data.text, data.turn)
    voice = await _voice(request).after_answer(player._mine(sid))
    return {**view, "voice": voice} if voice is not None else view


# --- Voz (Agora) --------------------------------------------------------------------
@router.get("/play/sessions/{sid}/voice")
def voice_status(sid: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    MoePlayer(db, cfg, user)._mine(sid)
    return _voice(request).status(sid)


@router.post("/play/sessions/{sid}/voice/prepare")
async def voice_prepare(sid: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return await _voice(request).prepare(MoePlayer(db, cfg, user)._mine(sid))


@router.post("/play/sessions/{sid}/voice/join")
async def voice_join(sid: str, channel: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep):
    return await _voice(request).join(MoePlayer(db, cfg, user)._mine(sid), channel)


@router.post("/play/sessions/{sid}/voice/leave")
async def voice_leave(sid: str, request: Request, user: UserDep, db: DbDep, cfg: SettingsDep, channel: str | None = None):
    MoePlayer(db, cfg, user)._mine(sid)
    return await _voice(request).leave(sid, channel)


@tools.post("/{sid}/chat/completions")
async def npc_listens(sid: str, request: Request):
    """LLM do agente de voz: chamado pela Agora quando a pessoa termina de falar. Não responde nada."""
    require_room(request.app.state.moe_voice, sid, request.headers.get("authorization", ""))
    media, body = silent_completion(await request.body())
    return Response(content=body, media_type=media)


@router.post("/play/sessions/{sid}/finish")
def finish(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).finish(sid)


@router.post("/play/sessions/{sid}/share")
def share(sid: str, data: ShareIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).share(sid, data.share)

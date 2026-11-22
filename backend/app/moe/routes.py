from fastapi import APIRouter, Response

from app.api.deps import DbDep, SettingsDep, UserDep

from .schemas import AnswerIn, PersonaIn, PersonaOut, PointIn, PointOut, ScenarioIn, ScenarioOut, ShareIn, StartIn
from .service import MoeAdmin, MoePlayer

router = APIRouter(prefix="/api/v1/moe", tags=["moe"])


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
def answer(sid: str, data: AnswerIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).answer(sid, data.scene_id, data.text, data.turn)


@router.post("/play/sessions/{sid}/finish")
def finish(sid: str, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).finish(sid)


@router.post("/play/sessions/{sid}/share")
def share(sid: str, data: ShareIn, user: UserDep, db: DbDep, cfg: SettingsDep):
    return MoePlayer(db, cfg, user).share(sid, data.share)

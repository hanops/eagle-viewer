from fastapi import APIRouter, Body

from app.config import VIEWER_STATE_PATH
from app.state_store import ViewerStateStore

router = APIRouter(prefix="/api", tags=["state"])
store = ViewerStateStore(VIEWER_STATE_PATH)


@router.get("/state")
def api_get_state():
    return {"state": store.read()}


@router.put("/state")
def api_put_state(state: dict = Body(...)):
    return {"state": store.replace(state)}

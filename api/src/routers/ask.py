from fastapi import APIRouter, Depends, HTTPException
from src.deps import current_user
from src.schemas import AskIn, AskOut

router = APIRouter(tags=["ask"])


@router.post("/ask", response_model=AskOut)
def ask(body: AskIn, user=Depends(current_user)):
    # TODO  services.retrieval (hybrid search) + services.answer (grounded, cited)
    raise HTTPException(501, "Not implemented yet")
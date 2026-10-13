from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.member import Member
from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.schemas.member import MemberRequest, MemberResponse
from app.database.session import get_session

router = APIRouter(tags=["Members"])


@router.get("", response_model=List[MemberResponse])
def get_all_members(session: Session = Depends(get_session)):
    return session.scalars(select(Member)).all()


@router.get("/get_by_status", response_model=List[MemberResponse])
def get_members_by_status(status: str, session: Session = Depends(get_session)):
    return session.scalars(select(Member).where(Member.status == status.casefold())).all()


@router.get("/{member_id}", response_model=MemberResponse)
def get_member_by_id(member_id: int = Path(gt=0), session: Session = Depends(get_session)):
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member with id {member_id} not found")
    return member


@router.post("/create_member", response_model=MemberResponse)
def create_member(req: MemberRequest, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=400, detail=f"User with id {req.user_id} does not exist")

    if req.membership_plan_id is not None:
        plan = session.get(MembershipPlan, req.membership_plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail=f"Membership plan {req.membership_plan_id} does not exist")

    new_member = Member(**req.model_dump(exclude={"id"}))
    session.add(new_member)
    session.commit()
    session.refresh(new_member)
    return new_member


@router.put("/update_member", response_model=MemberResponse)
def update_member(req: MemberRequest, session: Session = Depends(get_session)):
    member = session.get(Member, req.id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member with id {req.id} not found")

    user = session.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=400, detail=f"User with id {req.user_id} does not exist")

    if req.membership_plan_id is not None:
        plan = session.get(MembershipPlan, req.membership_plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail=f"Membership plan {req.membership_plan_id} does not exist")

    member.user_id = req.user_id
    member.email = req.email
    member.status = req.status
    member.membership_plan_id = req.membership_plan_id
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@router.delete("/delete_member/{member_id}")
def delete_member(member_id: int = Path(gt=0), session: Session = Depends(get_session)):
    member = session.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member with id {member_id} not found")
    session.delete(member)
    session.commit()
    return {"detail": f"Member {member_id} deleted successfully"}

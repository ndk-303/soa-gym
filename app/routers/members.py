from fastapi import APIRouter, HTTPException

from app.models.member import Member
from app.schemas.member import MemberRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_members():
    return db.MEMBERS


@router.get("/get_by_status")
async def get_by_status(status: str):
    return [m for m in db.MEMBERS if m.status.casefold() == status.casefold()]


@router.get("/{id}")
async def get_member(id: int):
    member = db.find_member_by_id(id)
    if member:
        return member
    raise HTTPException(status_code=404, detail="Member not found")


@router.post("/create_member")
async def create_member(request_member: MemberRequest):
    user = db.find_user_by_id(request_member.user_id)
    if not user:
        raise HTTPException(
            status_code=400,
            detail=f"User with id {request_member.user_id} does not exist",
        )

    if request_member.membership_plan_id is not None:
        plan = db.find_plan_by_id(request_member.membership_plan_id)
        if not plan:
            raise HTTPException(
                status_code=400,
                detail=f"Membership plan {request_member.membership_plan_id} does not exist",
            )

    new_member = Member(
        id=db.get_next_id(db.MEMBERS),
        user_id=request_member.user_id,
        email=request_member.email,
        status=request_member.status,
        membership_plan_id=request_member.membership_plan_id,
    )
    db.MEMBERS.append(new_member)
    return new_member


@router.put("/update_member")
async def update_member(request_member: MemberRequest):
    for i, m in enumerate(db.MEMBERS):
        if m.id == request_member.id:
            updated = Member(
                id=request_member.id,
                user_id=request_member.user_id,
                email=request_member.email,
                status=request_member.status,
                membership_plan_id=request_member.membership_plan_id,
            )
            db.MEMBERS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Member not found")


@router.delete("/delete_member/{id}")
async def delete_member(id: int):
    for i, m in enumerate(db.MEMBERS):
        if m.id == id:
            db.MEMBERS.pop(i)
            return {"message": f"Member {id} deleted"}
    raise HTTPException(status_code=404, detail="Member not found")

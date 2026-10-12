from typing import Optional

import httpx
from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

USER_SERVICE_URL = "http://127.0.0.1:8001"
PLAN_SERVICE_URL = "http://127.0.0.1:8002"


async def check_user_exists(user_id: int) -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{USER_SERVICE_URL}/users/{user_id}")
            return res.status_code == 200
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="User service is unavailable")


async def check_plan_exists(plan_id: int) -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{PLAN_SERVICE_URL}/membership_plans/{plan_id}")
            return res.status_code == 200
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Membership plan service is unavailable")


class Member:
    id: int
    user_id: int
    email: str
    status: str
    membership_plan_id: Optional[int]

    def __init__(self, id, user_id, email, status="active", membership_plan_id=None):
        self.id = id
        self.user_id = user_id
        self.email = email
        self.status = status
        self.membership_plan_id = membership_plan_id


class MemberRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    user_id: int = Field(gt=0)
    email: str = Field(min_length=5, max_length=100)
    status: str = Field(default="active", min_length=4, max_length=20)
    membership_plan_id: Optional[int] = Field(default=None, gt=0)

    class Config:
        json_schema_extra = {
            'example': {
                'user_id': 4,
                'email': 'member.an@gym.com',
                'status': 'active',
                'membership_plan_id': 1,
            }
        }


MEMBERS = [
    Member(1, 4, "member.an@gym.com", "active", 1),
    Member(2, 5, "member.binh@gym.com", "active", 2),
    Member(3, 6, "member.cuong@gym.com", "inactive", None),
]


@app.get("/")
async def home():
    return {"message": "Member Service"}


@app.get("/members")
async def get_all_members():
    return MEMBERS


@app.get("/members/get_by_status")
async def get_by_status(status: str):
    members_result = []
    for member in MEMBERS:
        if member.status.casefold() == status.casefold():
            members_result.append(member)
    return members_result


@app.get("/members/{id}")
async def get_member(id: int):
    for member in MEMBERS:
        if member.id == id:
            return member
    raise HTTPException(status_code=404, detail="Member not found")


@app.post("/member/create_member")
async def create_member(request_member: MemberRequest):
    user_ok = await check_user_exists(request_member.user_id)
    if not user_ok:
        raise HTTPException(status_code=400, detail=f"User with id {request_member.user_id} does not exist")

    if request_member.membership_plan_id is not None:
        plan_ok = await check_plan_exists(request_member.membership_plan_id)
        if not plan_ok:
            raise HTTPException(status_code=400, detail=f"Membership plan {request_member.membership_plan_id} does not exist")

    new_member = Member(**request_member.dict())
    new_member = find_member_id(new_member)
    MEMBERS.append(new_member)
    return new_member


def find_member_id(member: Member):
    member.id = 1 if len(MEMBERS) == 0 else MEMBERS[-1].id + 1
    return member


@app.put("/member/update_member")
async def update_member(member: MemberRequest):
    for i in range(len(MEMBERS)):
        if MEMBERS[i].id == member.id:
            MEMBERS[i] = member


@app.delete("/members/delete_member/{id}")
async def delete_member(id: int):
    for i in range(len(MEMBERS)):
        if MEMBERS[i].id == id:
            MEMBERS.pop(i)
            break

from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


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


@app.post("/member/create_member")
async def create_member(request_member: MemberRequest):
    new_member = Member(**request_member.dict())
    MEMBERS.append(find_member_id(new_member))


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

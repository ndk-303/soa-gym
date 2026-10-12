from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


class MembershipPlan:
    id: int
    name: str
    duration_days: int
    price: float
    is_active: bool

    def __init__(self, id, name, duration_days, price, is_active=True):
        self.id = id
        self.name = name
        self.duration_days = duration_days
        self.price = price
        self.is_active = is_active


class MembershipPlanRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    name: str = Field(min_length=3, max_length=100)
    duration_days: int = Field(gt=0, lt=366)
    price: float = Field(gt=0, lt=100000000)
    is_active: bool = Field(default=True)

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Goi 1 Thang Co Ban',
                'duration_days': 30,
                'price': 500000.0,
                'is_active': True,
            }
        }


MEMBERSHIP_PLANS = [
    MembershipPlan(1, "Goi 1 Thang Co Ban", 30, 500000.0, True),
    MembershipPlan(2, "Goi 3 Thang VIP", 90, 1350000.0, True),
    MembershipPlan(3, "Goi 6 Thang Pro", 180, 2500000.0, True),
    MembershipPlan(4, "Goi 1 Nam Platinum", 365, 4800000.0, True),
]


@app.get("/")
async def home():
    return {"message": "Membership Plan Service"}


@app.get("/membership_plans")
async def get_all_plans():
    return MEMBERSHIP_PLANS


@app.get("/membership_plans/get_by_duration")
async def get_by_duration(duration_days: int):
    plans_result = []
    for plan in MEMBERSHIP_PLANS:
        if plan.duration_days == duration_days:
            plans_result.append(plan)
    return plans_result


@app.get("/membership_plans/{id}")
async def get_plan(id: int):
    for plan in MEMBERSHIP_PLANS:
        if plan.id == id:
            return plan


@app.post("/membership_plan/create_plan")
async def create_plan(request_plan: MembershipPlanRequest):
    new_plan = MembershipPlan(**request_plan.dict())
    MEMBERSHIP_PLANS.append(find_plan_id(new_plan))


def find_plan_id(plan: MembershipPlan):
    plan.id = 1 if len(MEMBERSHIP_PLANS) == 0 else MEMBERSHIP_PLANS[-1].id + 1
    return plan


@app.put("/membership_plan/update_plan")
async def update_plan(plan: MembershipPlanRequest):
    for i in range(len(MEMBERSHIP_PLANS)):
        if MEMBERSHIP_PLANS[i].id == plan.id:
            MEMBERSHIP_PLANS[i] = plan


@app.delete("/membership_plans/delete_plan/{id}")
async def delete_plan(id: int):
    for i in range(len(MEMBERSHIP_PLANS)):
        if MEMBERSHIP_PLANS[i].id == id:
            MEMBERSHIP_PLANS.pop(i)
            break

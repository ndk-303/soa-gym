from fastapi import APIRouter, HTTPException

from app.models.membership_plan import MembershipPlan
from app.schemas.membership_plan import MembershipPlanRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_plans():
    return db.MEMBERSHIP_PLANS


@router.get("/get_by_duration")
async def get_by_duration(duration_days: int):
    return [p for p in db.MEMBERSHIP_PLANS if p.duration_days == duration_days]


@router.get("/{id}")
async def get_plan(id: int):
    plan = db.find_plan_by_id(id)
    if plan:
        return plan
    raise HTTPException(status_code=404, detail="Membership plan not found")


@router.post("/create_plan")
async def create_plan(request_plan: MembershipPlanRequest):
    new_plan = MembershipPlan(
        id=db.get_next_id(db.MEMBERSHIP_PLANS),
        name=request_plan.name,
        duration_days=request_plan.duration_days,
        price=request_plan.price,
        is_active=request_plan.is_active,
    )
    db.MEMBERSHIP_PLANS.append(new_plan)
    return new_plan


@router.put("/update_plan")
async def update_plan(request_plan: MembershipPlanRequest):
    for i, p in enumerate(db.MEMBERSHIP_PLANS):
        if p.id == request_plan.id:
            updated = MembershipPlan(
                id=request_plan.id,
                name=request_plan.name,
                duration_days=request_plan.duration_days,
                price=request_plan.price,
                is_active=request_plan.is_active,
            )
            db.MEMBERSHIP_PLANS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Membership plan not found")


@router.delete("/delete_plan/{id}")
async def delete_plan(id: int):
    for i, p in enumerate(db.MEMBERSHIP_PLANS):
        if p.id == id:
            db.MEMBERSHIP_PLANS.pop(i)
            return {"message": f"Membership plan {id} deleted"}
    raise HTTPException(status_code=404, detail="Membership plan not found")

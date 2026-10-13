from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.membership_plan import MembershipPlan
from app.schemas.membership_plan import MembershipPlanRequest, MembershipPlanResponse
from app.database.session import get_session

router = APIRouter(tags=["Membership Plans"])


@router.get("", response_model=List[MembershipPlanResponse])
def get_all_plans(session: Session = Depends(get_session)):
    return session.scalars(select(MembershipPlan)).all()


@router.get("/get_by_duration", response_model=List[MembershipPlanResponse])
def get_plans_by_duration(duration_days: int, session: Session = Depends(get_session)):
    return session.scalars(select(MembershipPlan).where(MembershipPlan.duration_days == duration_days)).all()


@router.get("/{plan_id}", response_model=MembershipPlanResponse)
def get_plan_by_id(plan_id: int = Path(gt=0), session: Session = Depends(get_session)):
    plan = session.get(MembershipPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Membership plan with id {plan_id} not found")
    return plan


@router.post("/create_plan", response_model=MembershipPlanResponse)
def create_plan(req: MembershipPlanRequest, session: Session = Depends(get_session)):
    new_plan = MembershipPlan(**req.model_dump(exclude={"id"}))
    session.add(new_plan)
    session.commit()
    session.refresh(new_plan)
    return new_plan


@router.put("/update_plan", response_model=MembershipPlanResponse)
def update_plan(req: MembershipPlanRequest, session: Session = Depends(get_session)):
    plan = session.get(MembershipPlan, req.id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Membership plan with id {req.id} not found")
    plan.name = req.name
    plan.duration_days = req.duration_days
    plan.price = req.price
    plan.is_active = req.is_active
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


@router.delete("/delete_plan/{plan_id}")
def delete_plan(plan_id: int = Path(gt=0), session: Session = Depends(get_session)):
    plan = session.get(MembershipPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Membership plan with id {plan_id} not found")
    session.delete(plan)
    session.commit()
    return {"detail": f"Membership plan {plan_id} deleted successfully"}

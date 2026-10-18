import sys
import os
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import MembershipPlan, Member
from schemas import MembershipPlan_Request, Member_Request
from database import engine, SessionLocal, get_db

app = FastAPI(title="Membership Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        if db.query(MembershipPlan).count() == 0:
            db.add_all([
                MembershipPlan(name="Goi 1 Thang Co Ban", duration_days=30, price=500000.0, is_active=True),
                MembershipPlan(name="Goi 3 Thang VIP", duration_days=90, price=1350000.0, is_active=True),
                MembershipPlan(name="Goi 1 Nam Platinum", duration_days=365, price=4800000.0, is_active=True),
            ])
            db.commit()

        if db.query(Member).count() == 0:
            db.add_all([
                Member(user_id=3, full_name="Nguyen Van An", email="member.an@gym.com", status="active", membership_plan_id=1),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "membership-service"}


# ==================== Membership Plans Endpoints ====================

@app.get("/membership-plans")
@app.get("/membership-plans/")
async def get_all_plans(db: db_dependency):
    return db.query(MembershipPlan).all()


@app.get("/membership-plans/{id}")
@app.get("/membership-plans/{id}/")
async def get_plan(db: db_dependency, id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    return plan


@app.post("/membership-plans", status_code=status.HTTP_201_CREATED)
@app.post("/membership-plans/", status_code=status.HTTP_201_CREATED)
async def create_plan(db: db_dependency, plan_request: MembershipPlan_Request):
    plan_model = MembershipPlan(**plan_request.dict())
    db.add(plan_model)
    db.commit()
    db.refresh(plan_model)
    return plan_model


@app.put("/membership-plans/{id}")
@app.put("/membership-plans/{id}/")
async def update_plan(db: db_dependency, id: int, plan_request: MembershipPlan_Request):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    plan.name = plan_request.name
    plan.duration_days = plan_request.duration_days
    plan.price = plan_request.price
    plan.is_active = plan_request.is_active
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@app.delete("/membership-plans/{id}")
@app.delete("/membership-plans/{id}/")
async def delete_plan(db: db_dependency, id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Membership Plan deleted successfully"}


# ==================== Members Endpoints ====================

@app.get("/members")
@app.get("/members/")
async def get_all_members(db: db_dependency):
    return db.query(Member).all()


@app.get("/members/{id}")
@app.get("/members/{id}/")
async def get_member(db: db_dependency, id: int):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@app.post("/members", status_code=status.HTTP_201_CREATED)
@app.post("/members/", status_code=status.HTTP_201_CREATED)
async def create_member(db: db_dependency, member_request: Member_Request):
    member_model = Member(**member_request.dict())
    db.add(member_model)
    db.commit()
    db.refresh(member_model)
    return member_model


@app.put("/members/{id}")
@app.put("/members/{id}/")
async def update_member(db: db_dependency, id: int, member_request: Member_Request):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    member.user_id = member_request.user_id
    member.full_name = member_request.full_name
    member.email = member_request.email
    member.status = member_request.status
    member.membership_plan_id = member_request.membership_plan_id
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@app.delete("/members/{id}")
@app.delete("/members/{id}/")
async def delete_member(db: db_dependency, id: int):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)

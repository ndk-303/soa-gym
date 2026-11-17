import sys
import os
import threading
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import MembershipPlan, Member
from schemas import MembershipPlan_Request, Member_Request
from database import engine, SessionLocal, get_db
from config import settings

app = FastAPI(title="Membership Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]

# Concurrency lock for membership and plan mutations
membership_lock = threading.RLock()


def _commit_with_rollback(db: Session, conflict_detail: str = "Duplicate resource conflict"):
    """Commit DB transaction with IntegrityError -> 409 and SQLAlchemyError -> 500 + rollback."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(exc)}",
        )


def _validate_plan_exists(db: Session, plan_id: int | None):
    if plan_id is not None:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Membership Plan not found",
            )


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
async def get_all_plans(db: db_dependency):
    return db.query(MembershipPlan).all()


@app.get("/membership-plans/{id}")
async def get_plan(db: db_dependency, id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    return plan


@app.post("/membership-plans", status_code=status.HTTP_201_CREATED)
def create_plan(db: db_dependency, plan_request: MembershipPlan_Request):
    with membership_lock:
        existing = db.query(MembershipPlan).filter(MembershipPlan.name == plan_request.name).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Membership Plan with this name already exists",
            )
        plan_model = MembershipPlan(**plan_request.dict())
        db.add(plan_model)
        _commit_with_rollback(db, "Membership Plan with this name already exists")
        db.refresh(plan_model)
        return plan_model


@app.put("/membership-plans/{id}")
def update_plan(db: db_dependency, id: int, plan_request: MembershipPlan_Request):
    with membership_lock:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
        if plan is None:
            raise HTTPException(status_code=404, detail="Membership Plan not found")
        if plan_request.name != plan.name:
            duplicate = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.name == plan_request.name, MembershipPlan.id != id)
                .first()
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Membership Plan with this name already exists",
                )
        plan.name = plan_request.name
        plan.duration_days = plan_request.duration_days
        plan.price = plan_request.price
        plan.is_active = plan_request.is_active
        db.add(plan)
        _commit_with_rollback(db, "Membership Plan with this name already exists")
        db.refresh(plan)
        return plan


@app.delete("/membership-plans/{id}")
def delete_plan(db: db_dependency, id: int):
    with membership_lock:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
        if plan is None:
            raise HTTPException(status_code=404, detail="Membership Plan not found")
        db.delete(plan)
        _commit_with_rollback(db)
        return {"message": "Membership Plan deleted successfully"}


# ==================== Members Endpoints ====================

@app.get("/members")
async def get_all_members(db: db_dependency):
    return db.query(Member).all()


@app.get("/members/{id}")
async def get_member(db: db_dependency, id: int):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@app.post("/members", status_code=status.HTTP_201_CREATED)
def create_member(db: db_dependency, member_request: Member_Request):
    with membership_lock:
        duplicate = (
            db.query(Member)
            .filter(or_(Member.user_id == member_request.user_id, Member.email == member_request.email))
            .first()
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Member with this user_id or email already exists",
            )
        _validate_plan_exists(db, member_request.membership_plan_id)

        member_model = Member(**member_request.dict())
        db.add(member_model)
        _commit_with_rollback(db, "Member with this user_id or email already exists")
        db.refresh(member_model)
        return member_model


@app.put("/members/{id}")
def update_member(db: db_dependency, id: int, member_request: Member_Request):
    with membership_lock:
        member = db.query(Member).filter(Member.id == id).first()
        if member is None:
            raise HTTPException(status_code=404, detail="Member not found")
        duplicate = (
            db.query(Member)
            .filter(
                Member.id != id,
                or_(Member.user_id == member_request.user_id, Member.email == member_request.email),
            )
            .first()
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Member with this user_id or email already exists",
            )
        _validate_plan_exists(db, member_request.membership_plan_id)

        member.user_id = member_request.user_id
        member.full_name = member_request.full_name
        member.email = member_request.email
        member.status = member_request.status
        member.membership_plan_id = member_request.membership_plan_id
        db.add(member)
        _commit_with_rollback(db, "Member with this user_id or email already exists")
        db.refresh(member)
        return member


@app.delete("/members/{id}")
def delete_member(db: db_dependency, id: int):
    with membership_lock:
        member = db.query(Member).filter(Member.id == id).first()
        if member is None:
            raise HTTPException(status_code=404, detail="Member not found")
        db.delete(member)
        _commit_with_rollback(db)
        return {"message": "Member deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")

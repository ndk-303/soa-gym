from fastapi import FastAPI

from app.routers.users import router as users_router
from app.routers.membership_plans import router as plans_router
from app.routers.members import router as members_router
from app.routers.gym_classes import router as classes_router
from app.routers.class_slots import router as slots_router
from app.routers.bookings import router as bookings_router
from app.routers.invoices import router as invoices_router
from app.routers.payments import router as payments_router
from app.routers.attendance import router as attendance_router

app = FastAPI(
    title="Gym Management System API",
    version="2.0.0",
    description="Unified Modular Monolith API for Gym Management",
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Gym Management System API",
        "version": "2.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


# Include all 9 modular routers
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(plans_router, prefix="/membership_plans", tags=["Membership Plans"])
app.include_router(members_router, prefix="/members", tags=["Members"])
app.include_router(classes_router, prefix="/gym_classes", tags=["Gym Classes"])
app.include_router(slots_router, prefix="/class_slots", tags=["Class Slots"])
app.include_router(bookings_router, prefix="/bookings", tags=["Bookings"])
app.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
app.include_router(payments_router, prefix="/payments", tags=["Payments"])
app.include_router(attendance_router, prefix="/attendance", tags=["Attendance"])

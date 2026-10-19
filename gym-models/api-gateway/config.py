import os

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://127.0.0.1:8001")
MEMBERSHIP_SERVICE_URL = os.getenv("MEMBERSHIP_SERVICE_URL", "http://127.0.0.1:8002")
CLASS_SERVICE_URL = os.getenv("CLASS_SERVICE_URL", "http://127.0.0.1:8003")
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://127.0.0.1:8004")
BILLING_SERVICE_URL = os.getenv("BILLING_SERVICE_URL", "http://127.0.0.1:8005")
ATTENDANCE_SERVICE_URL = os.getenv("ATTENDANCE_SERVICE_URL", "http://127.0.0.1:8006")

SERVICE_MAP = {
    "users": (USER_SERVICE_URL, "/users"),
    "membership-plans": (MEMBERSHIP_SERVICE_URL, "/membership-plans"),
    "members": (MEMBERSHIP_SERVICE_URL, "/members"),
    "gym-classes": (CLASS_SERVICE_URL, "/gym-classes"),
    "class-slots": (CLASS_SERVICE_URL, "/class-slots"),
    "bookings": (BOOKING_SERVICE_URL, "/bookings"),
    "invoices": (BILLING_SERVICE_URL, "/invoices"),
    "payments": (BILLING_SERVICE_URL, "/payments"),
    "attendances": (ATTENDANCE_SERVICE_URL, "/attendance"),
    "attendance": (ATTENDANCE_SERVICE_URL, "/attendance"),
    "auth": (USER_SERVICE_URL, "/users"),
}

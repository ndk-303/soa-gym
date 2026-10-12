from typing import Optional


class Member:
    id: int
    user_id: int
    email: str
    status: str
    membership_plan_id: Optional[int]

    def __init__(self, id: int, user_id: int, email: str, status: str = "active", membership_plan_id: Optional[int] = None):
        self.id = id
        self.user_id = user_id
        self.email = email
        self.status = status
        self.membership_plan_id = membership_plan_id

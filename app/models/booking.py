from typing import Optional


class Booking:
    id: int
    member_id: int
    slot_id: int
    status: str
    waitlist_position: Optional[int]

    def __init__(self, id: int, member_id: int, slot_id: int, status: str = "confirmed", waitlist_position: Optional[int] = None):
        self.id = id
        self.member_id = member_id
        self.slot_id = slot_id
        self.status = status
        self.waitlist_position = waitlist_position

from typing import Optional


class AttendanceRecord:
    id: int
    member_id: int
    status: str
    check_in_time: str
    check_out_time: Optional[str]
    notes: Optional[str]

    def __init__(self, id: int, member_id: int, status: str = "checked_in", check_in_time: str = "2026-10-11 08:00:00", check_out_time: Optional[str] = None, notes: Optional[str] = ""):
        self.id = id
        self.member_id = member_id
        self.status = status
        self.check_in_time = check_in_time
        self.check_out_time = check_out_time
        self.notes = notes

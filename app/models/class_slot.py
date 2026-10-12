class ClassSlot:
    id: int
    class_id: int
    start_time: str
    max_capacity: int
    current_bookings: int
    is_cancelled: bool

    def __init__(self, id: int, class_id: int, start_time: str, max_capacity: int = 20, current_bookings: int = 0, is_cancelled: bool = False):
        self.id = id
        self.class_id = class_id
        self.start_time = start_time
        self.max_capacity = max_capacity
        self.current_bookings = current_bookings
        self.is_cancelled = is_cancelled

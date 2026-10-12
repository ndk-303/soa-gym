class MembershipPlan:
    id: int
    name: str
    duration_days: int
    price: float
    is_active: bool

    def __init__(self, id: int, name: str, duration_days: int, price: float, is_active: bool = True):
        self.id = id
        self.name = name
        self.duration_days = duration_days
        self.price = price
        self.is_active = is_active

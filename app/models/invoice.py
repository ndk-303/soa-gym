class Invoice:
    id: int
    member_id: int
    amount: float
    amount_paid: float
    status: str

    def __init__(self, id: int, member_id: int, amount: float, amount_paid: float = 0.0, status: str = "pending"):
        self.id = id
        self.member_id = member_id
        self.amount = amount
        self.amount_paid = amount_paid
        self.status = status

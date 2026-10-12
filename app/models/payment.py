from typing import Optional


class Payment:
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    notes: Optional[str]

    def __init__(self, id: int, invoice_id: int, amount: float, payment_method: str = "cash", notes: Optional[str] = ""):
        self.id = id
        self.invoice_id = invoice_id
        self.amount = amount
        self.payment_method = payment_method
        self.notes = notes

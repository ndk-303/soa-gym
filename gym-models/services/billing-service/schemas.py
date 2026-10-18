from typing import Optional
from pydantic import BaseModel, Field


class Invoice_Request(BaseModel):
    member_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    amount_paid: float = Field(default=0.0, ge=0)
    status: str = Field(default="pending", min_length=4, max_length=20)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'amount': 1350000.0,
                'amount_paid': 0.0,
                'status': 'pending',
            }
        }


class Payment_Request(BaseModel):
    invoice_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    payment_method: str = Field(min_length=3, max_length=30)
    notes: Optional[str] = Field(default="", max_length=255)

    class Config:
        json_schema_extra = {
            'example': {
                'invoice_id': 1,
                'amount': 500000.0,
                'payment_method': 'bank_transfer',
                'notes': 'Chuyen khoan VietQR',
            }
        }

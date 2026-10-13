from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PaymentRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    invoice_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    payment_method: str = Field(min_length=3, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=255)

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            'example': {
                'invoice_id': 1,
                'amount': 500000.0,
                'payment_method': 'cash',
                'notes': 'Thanh toan tien mat',
            }
        }
    )


PaymentResponse = PaymentRequest

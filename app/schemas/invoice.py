from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class InvoiceRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    amount_paid: float = Field(default=0.0, ge=0)
    status: str = Field(default="pending", min_length=4, max_length=20)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'member_id': 1,
                'amount': 1350000.0,
                'amount_paid': 0.0,
                'status': 'pending',
            }
        }
    )

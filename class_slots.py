from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


class ClassSlot:
    id: int
    class_id: int
    start_time: str
    max_capacity: int
    current_bookings: int
    is_cancelled: bool

    def __init__(self, id, class_id, start_time, max_capacity=20, current_bookings=0, is_cancelled=False):
        self.id = id
        self.class_id = class_id
        self.start_time = start_time
        self.max_capacity = max_capacity
        self.current_bookings = current_bookings
        self.is_cancelled = is_cancelled


class ClassSlotRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    class_id: int = Field(gt=0)
    start_time: str = Field(min_length=10, max_length=30)
    max_capacity: int = Field(gt=0, lt=101)
    current_bookings: int = Field(default=0, ge=0)
    is_cancelled: bool = Field(default=False)

    class Config:
        json_schema_extra = {
            'example': {
                'class_id': 1,
                'start_time': '2026-10-12 06:00:00',
                'max_capacity': 15,
                'current_bookings': 0,
                'is_cancelled': False,
            }
        }


CLASS_SLOTS = [
    ClassSlot(1, 1, "2026-10-12 06:00:00", 15, 5, False),
    ClassSlot(2, 1, "2026-10-12 18:00:00", 15, 12, False),
    ClassSlot(3, 2, "2026-10-13 07:00:00", 20, 20, False),
    ClassSlot(4, 3, "2026-10-13 19:00:00", 20, 0, True),
]


@app.get("/")
async def home():
    return {"message": "Class Slot Service"}


@app.get("/class_slots")
async def get_all_slots():
    return CLASS_SLOTS


@app.get("/class_slots/get_by_class")
async def get_by_class(class_id: int):
    slots_result = []
    for slot in CLASS_SLOTS:
        if slot.class_id == class_id:
            slots_result.append(slot)
    return slots_result


@app.get("/class_slots/{id}")
async def get_slot(id: int):
    for slot in CLASS_SLOTS:
        if slot.id == id:
            return slot


@app.post("/class_slot/create_slot")
async def create_slot(request_slot: ClassSlotRequest):
    new_slot = ClassSlot(**request_slot.dict())
    CLASS_SLOTS.append(find_slot_id(new_slot))


def find_slot_id(slot: ClassSlot):
    slot.id = 1 if len(CLASS_SLOTS) == 0 else CLASS_SLOTS[-1].id + 1
    return slot


@app.put("/class_slot/update_slot")
async def update_slot(slot: ClassSlotRequest):
    for i in range(len(CLASS_SLOTS)):
        if CLASS_SLOTS[i].id == slot.id:
            CLASS_SLOTS[i] = slot


@app.delete("/class_slots/delete_slot/{id}")
async def delete_slot(id: int):
    for i in range(len(CLASS_SLOTS)):
        if CLASS_SLOTS[i].id == id:
            CLASS_SLOTS.pop(i)
            break

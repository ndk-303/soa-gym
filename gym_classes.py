from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


class GymClass:
    id: int
    name: str
    category: str
    trainer_id: int
    is_active: bool

    def __init__(self, id, name, category, trainer_id, is_active=True):
        self.id = id
        self.name = name
        self.category = category
        self.trainer_id = trainer_id
        self.is_active = is_active


class GymClassRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    name: str = Field(min_length=3, max_length=100)
    category: str = Field(min_length=3, max_length=50)
    trainer_id: int = Field(gt=0)
    is_active: bool = Field(default=True)

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Yoga Binh Minh',
                'category': 'Yoga',
                'trainer_id': 2,
                'is_active': True,
            }
        }


GYM_CLASSES = [
    GymClass(1, "Yoga Binh Minh", "Yoga", 2, True),
    GymClass(2, "Boxing Doi Khang", "Boxing", 3, True),
    GymClass(3, "HIIT Dot Mo Nhanh", "Cardio", 2, True),
    GymClass(4, "Pilates Co Ban", "Pilates", 3, False),
]


@app.get("/")
async def home():
    return {"message": "Gym Class Service"}


@app.get("/gym_classes")
async def get_all_classes():
    return GYM_CLASSES


@app.get("/gym_classes/get_by_category")
async def get_by_category(category: str):
    category_result = []
    for gym_class in GYM_CLASSES:
        if gym_class.category.casefold() == category.casefold():
            category_result.append(gym_class)
    return category_result


@app.get("/gym_classes/{id}")
async def get_class(id: int):
    for gym_class in GYM_CLASSES:
        if gym_class.id == id:
            return gym_class


@app.post("/gym_class/create_class")
async def create_class(request_class: GymClassRequest):
    new_class = GymClass(**request_class.dict())
    GYM_CLASSES.append(find_class_id(new_class))


def find_class_id(gym_class: GymClass):
    gym_class.id = 1 if len(GYM_CLASSES) == 0 else GYM_CLASSES[-1].id + 1
    return gym_class


@app.put("/gym_class/update_class")
async def update_class(gym_class: GymClassRequest):
    for i in range(len(GYM_CLASSES)):
        if GYM_CLASSES[i].id == gym_class.id:
            GYM_CLASSES[i] = gym_class


@app.delete("/gym_classes/delete_class/{id}")
async def delete_class(id: int):
    for i in range(len(GYM_CLASSES)):
        if GYM_CLASSES[i].id == id:
            GYM_CLASSES.pop(i)
            break

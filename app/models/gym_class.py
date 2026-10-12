class GymClass:
    id: int
    name: str
    category: str
    trainer_id: int
    is_active: bool

    def __init__(self, id: int, name: str, category: str, trainer_id: int, is_active: bool = True):
        self.id = id
        self.name = name
        self.category = category
        self.trainer_id = trainer_id
        self.is_active = is_active

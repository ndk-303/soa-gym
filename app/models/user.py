class User:
    id: int
    email: str
    role: str
    password: str

    def __init__(self, id: int, email: str, role: str, password: str):
        self.id = id
        self.email = email
        self.role = role
        self.password = password

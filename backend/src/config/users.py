from typing import List
from pydantic import BaseModel


class User(BaseModel):
    username: str
    password: str
    company: str
    role: str
    disabled: bool = False


# Data users dalam bentuk list
USERS: List[User] = [
    User(
        username="admin",
        password="wkwkwk",
        company="company_a",
        role="admin",
        disabled=False,
    ),
    User(
        username="user1",
        password="wkwkwk",
        company="company_a",
        role="user",
        disabled=False,
    ),
    User(
        username="user2",
        password="password2",
        company="company_b",
        role="user",
        disabled=False,
    ),
]


# Helper functions
def get_user_by_username(username: str) -> User | None:
    return next((user for user in USERS if user.username == username), None)


def get_users_by_company(company: str) -> List[User]:
    return [user for user in USERS if user.company == company]


def get_users_by_role(role: str) -> List[User]:
    return [user for user in USERS if user.role == role]

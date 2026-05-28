from sqlalchemy import create_engine, String, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

from sqlalchemy_studio import Studio
# -----------------------
# Base model
# -----------------------
class Base(DeclarativeBase):
    pass


# -----------------------
# User table
# -----------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(120), nullable=False)


# -----------------------
# Database setup
# -----------------------
engine = create_engine("sqlite:///app.db", echo=True)


def create_db():
    Base.metadata.create_all(engine)


# -----------------------
# CRUD operations
# -----------------------
def create_user(username: str, email: str):
    with Session(engine) as session:
        user = User(username=username, email=email)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def get_users():
    with Session(engine) as session:
        return session.query(User).all()


def get_user_by_id(user_id: int):
    with Session(engine) as session:
        return session.query(User).filter(User.id == user_id).first()


def delete_user(user_id: int):
    with Session(engine) as session:
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            session.delete(user)
            session.commit()
            return True
        return False


# -----------------------
# Example usage
# -----------------------
if __name__ == "__main__":
    create_db()

    u1 = create_user("john", "john@example.com")
    u2 = create_user("alice", "alice@example.com")

    print("Created:", u1.username, u1.email)
    print("Created:", u2.username, u2.email)

    print("\nAll users:")
    for u in get_users():
        print(u.id, u.username, u.email)

    print("\nSingle user:")
    user = get_user_by_id(1)

    print("\nDelete user 1:", delete_user(1))

    print("\nRemaining users:")
    for u in get_users():
        print(u.id, u.username, u.email)

Studio(engine=engine, base=Base).run(port=7000)
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, Session

from db.main import Studio

Base = declarative_base()


# --------------------
# 1. Define table
# --------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)


# --------------------
# 2. Create DB
# --------------------
engine = create_engine("sqlite:///test.db")
Base.metadata.create_all(engine)


# --------------------
# 3. Insert sample data
# --------------------
with Session(engine) as session:
    if session.query(User).count() == 0:
        session.add_all(
            [
                User(name="Alex", email="alex@mail.com"),
                User(name="John", email="john@mail.com"),
                User(name="Sara", email="sara@mail.com"),
            ]
        )
        session.commit()


# --------------------
# 4. Run Studio
# --------------------
studio = Studio(engine, Base)
studio.run(port=9000)

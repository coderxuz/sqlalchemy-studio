from sqlalchemy import create_engine, Column, Integer, String, Float, select, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Session, relationship

from db.main import Studio

# --------------------
from sqlalchemy.orm import DeclarativeBase, Session



# 1. Define table
# --------------------
class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)

    # Relationship: Connects a User to their multiple products
    # back_populates links it directly to the 'owner' attribute in the Product model
    products = relationship(
        "Product", back_populates="owner", cascade="all, delete-orphan"
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)

    # Foreign Key: Stores the ID of the user who owns this product
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Relationship: Connects a single Product back to its single User owner
    owner = relationship("User", back_populates="products")


# --------------------
# 2. Create DB Engine & Tables
# --------------------
engine = create_engine("sqlite:///test.db")
Base.metadata.create_all(engine)


# --------------------
# 3. Insert 10 Users and 10 Products
# --------------------
with Session(engine) as session:
    # Check if database is already seeded to avoid duplicates or partial states
    if session.query(User).count() == 0 and session.query(Product).count() == 0:

        # 1. Create the 10 Users
        users = [
            User(name="Alex Johnson", email="alex@example.com"),
            User(name="John Doe", email="john@example.com"),
            User(name="Sara Smith", email="sara@example.com"),
            User(name="Emma Watson", email="emma@example.com"),
            User(name="Michael Brown", email="michael@example.com"),
            User(name="David Miller", email="david@example.com"),
            User(name="Lisa Anderson", email="lisa@example.com"),
            User(name="James Wilson", email="james@example.com"),
            User(name="Emily Davis", email="emily@example.com"),
            User(name="Daniel Taylor", email="daniel@example.com"),
        ]

        # 2. Create the 10 Products
        products = [
            Product(title="Wireless Mouse", price=25.99, category="Electronics"),
            Product(title="Mechanical Keyboard", price=89.99, category="Electronics"),
            Product(title="Leather Journal", price=14.50, category="Stationery"),
            Product(title="Desk Mat", price=19.99, category="Office Supplies"),
            Product(title="Coffee Mug", price=12.00, category="Kitchen"),
            Product(title="Water Bottle", price=22.50, category="Kitchen"),
            Product(title="Backpack", price=45.00, category="Travel"),
            Product(title="USB-C Hub", price=34.99, category="Electronics"),
            Product(title="Running Shoes", price=75.00, category="Apparel"),
            Product(
                title="Noise Cancelling Headphones",
                price=199.99,
                category="Electronics",
            ),
        ]

        # 3. Explicitly link each product to a user before committing
        for i in range(10):
            users[i].products.append(products[i])

        # 4. Add the users (this will cascade add the attached products)
        session.add_all(users)
        session.commit()
        print("Successfully seeded users and products!")
    else:
        print("Database already contains data. Seeding skipped.")
# --------------------
# 4. Run Studio
# --------------------
studio = Studio(engine, Base)
studio.run(port=9000)

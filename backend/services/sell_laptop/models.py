from sqlalchemy import Column, Integer, String, Float, event, Text
from backend.shared.db.connections import Base
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy import ForeignKey


class LaptopList(Base):
    __tablename__ = "laptops_list"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String)
    model = Column(String)
    selling_price = Column(Float)
    image_url = Column(String)

    search_text = Column(Text, nullable=True, index=True)
    search_vector = Column(TSVECTOR, nullable=True)


class LaptopConfiguration(Base):
    __tablename__ = "laptop_configurations"

    id = Column(Integer, primary_key=True, index=True)
    laptop_id = Column(Integer, ForeignKey("laptops_list.id"))

    ram_gb = Column(Integer)
    storage_gb = Column(Integer)
    processor = Column(String)
    storage_type = Column(String)
    screen_size = Column(String)
    graphics = Column(String)

    price = Column(Float)


@event.listens_for(LaptopList, "before_insert")
def update_search_text_on_insert(mapper, connection, target):
    if target.brand and target.model:
        target.search_text = f"{target.brand} {target.model}".lower()


@event.listens_for(LaptopList, "before_update")
def update_search_text_on_update(mapper, connection, target):
    if target.brand and target.model:
        target.search_text = f"{target.brand} {target.model}".lower()

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.shared.db.connections import get_db
from backend.services.sell_laptop.models import LaptopList
from backend.services.sell_laptop.models import LaptopConfiguration
from math import ceil

router = APIRouter(prefix="/sell-laptop", tags=["Sell Laptop"])


@router.get("/laptops")
def get_laptops(
    db: Session = Depends(get_db),
    page: int = Query(1),
    limit: int = Query(10),
    search: str = Query(None),
):
    if not search:
        # No search then normal pagination
        query = db.query(LaptopList).order_by(LaptopList.brand, LaptopList.model)
        total = query.count()
        laptops = query.offset((page - 1) * limit).limit(limit).all()

    else:
        search_normalized = search.lower().strip()

        # TRIGRAM SIMILARITY
        similarity_score = func.similarity(LaptopList.search_text, search_normalized)

        query = (
            db.query(LaptopList, similarity_score.label("similarity"))
            .filter(
                LaptopList.search_text.op("%")(search_normalized)
                | LaptopList.search_text.ilike(f"%{search_normalized}%")
            )
            .order_by(similarity_score.desc(), LaptopList.brand, LaptopList.model)
        )

        results = query.all()

        # Deduplicate (brand and model)
        deduped = {}
        for laptop, score in results:
            key = (laptop.brand, laptop.model)
            if key not in deduped:
                deduped[key] = (laptop, score)
            else:
                existing, _ = deduped[key]
                if laptop.selling_price > existing.selling_price:
                    deduped[key] = (laptop, score)

        sorted_results = sorted(deduped.values(), key=lambda x: x[1], reverse=True)

        total = len(sorted_results)

        paginated = sorted_results[(page - 1) * limit : (page - 1) * limit + limit]

        laptops = [l for l, _ in paginated]

    # RESPONSE FORMAT
    result = []
    for item in laptops:
        result.append(
            {
                "id": item.id,
                "Brand": item.brand,
                "Model": item.model,
                "Selling_Price": item.selling_price,
                "image_url": item.image_url,
            }
        )

    return {
        "laptops": result,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": ceil(total / limit) if total else 1,
    }


@router.get("/laptops/{laptop_id}")
def get_laptop_by_id(laptop_id: int, db: Session = Depends(get_db)):
    laptop = db.query(LaptopList).filter(LaptopList.id == laptop_id).first()

    if not laptop:
        return {}

    configs = (
        db.query(LaptopConfiguration)
        .filter(LaptopConfiguration.laptop_id == laptop_id)
        .all()
    )

    config_list = []
    for c in configs:
        config_list.append(
            {
                "ram_gb": c.ram_gb,
                "storage_gb": c.storage_gb,
                "processor": c.processor,
                "storage_type": c.storage_type,
                "screen_size": c.screen_size,
                "graphics": c.graphics,
                "price": c.price,
            }
        )

    return {
        "id": laptop.id,
        "Brand": laptop.brand,
        "Model": laptop.model,
        "image_url": laptop.image_url,
        "configs": config_list,
    }

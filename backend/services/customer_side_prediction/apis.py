from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.shared.db.connections import get_db
from backend.services.customer_side_prediction.schema import (
    PricePredictionRequest,
    PricePredictionResponse,
)
from backend.services.customer_side_prediction.utils import (
    get_mistral_chain,
    get_phone_price_from_db,
)
import logging
from backend.services.sell_laptop.models import LaptopConfiguration, LaptopList
from fastapi import Request

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/customer-side-prediction", tags=["Customer Side Prediction"]
)


@router.post("/predict-price", response_model=PricePredictionResponse)
async def predict_phone_price(
    request: PricePredictionRequest, db: Session = Depends(get_db)
):
    try:
        # Decide device type
        is_laptop = request.laptop_details is not None

        # BASE PRICE LOGIC
        if request.phone_details:
            try:
                base_price = get_phone_price_from_db(
                    db,
                    brand=request.phone_details.brand,
                    model=request.phone_details.model,
                    ram_gb=request.phone_details.ram_gb,
                    storage_gb=request.phone_details.storage_gb,
                )
                logger.info(f"Phone base price: ₹{base_price}")
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))

        # elif request.laptop_details:
        # laptop = request.laptop_details

        # VALIDATE REQUIRED FIELDS (production-safe)
        # required_fields = [
        # laptop.screen_condition,
        # laptop.device_turns_on,
        # laptop.keyboard_issue,
        # laptop.touchpad_issue,
        # laptop.wifi_issue,
        # laptop.speaker_issue,
        # laptop.battery_condition,
        # laptop.body_condition,
        # laptop.hinge_condition,
        # laptop.screen_spots,
        # laptop.has_original_box,
        # laptop.has_original_bill,
        # laptop.has_charger,
        # laptop.device_age,
        # ]

        # if any(v is None for v in required_fields):
        # raise HTTPException(
        # status_code=400,
        # detail="Incomplete laptop details for price prediction",
        # )

        # query = db.query(LaptopConfiguration).filter(
        # LaptopConfiguration.ram_gb == laptop.ram_gb,
        # LaptopConfiguration.storage_gb == laptop.storage_gb,
        # )

        # if laptop.processor:
        # query = query.filter(
        # LaptopConfiguration.processor.ilike(f"%{laptop.processor}%")
        # )

        # if laptop.storage_type:
        # query = query.filter(
        # LaptopConfiguration.storage_type.ilike(f"%{laptop.storage_type}%")
        # )

        # if laptop.graphics:
        # query = query.filter(
        # LaptopConfiguration.graphics.ilike(f"%{laptop.graphics}%")
        # )

        # config = query.first()

        # if not config:
        # laptop_base = (
        # db.query(LaptopList)
        # .filter(
        # LaptopList.brand.ilike(laptop.brand),
        # LaptopList.model.ilike(f"%{laptop.model}%"),
        # )
        # .first()
        # )

        # if laptop_base:
        # base_price = laptop_base.base_price
        # else:
        # base_price = 50000
        # else:
        # base_price = config.price

        elif request.laptop_details:
            raise HTTPException(
                status_code=503, detail="Laptop valuation temporarily disabled"
            )

        else:
            raise HTTPException(status_code=400, detail="No device details provided")

        # COMMON DETAILS (phone OR laptop)
        details = request.laptop_details or request.phone_details

        # LLM
        chain = get_mistral_chain()
        max_retries = 3
        attempt = 1

        while attempt <= max_retries:
            raw = chain.invoke(
                {
                    "brand": details.brand,
                    "model": details.model,
                    "ram_gb": getattr(details, "ram_gb", None) or "Not specified",
                    "storage_gb": getattr(details, "storage_gb", None)
                    or "Not specified",
                    "screen_condition": details.screen_condition,
                    "device_turns_on": "Yes" if details.device_turns_on else "No",
                    "has_original_box": "Yes" if details.has_original_box else "No",
                    "has_original_bill": "Yes" if details.has_original_bill else "No",
                    "device_age": details.device_age or "Not specified",
                    "base_price": base_price,
                    "processor": getattr(details, "processor", ""),
                    "graphics": getattr(details, "graphics", ""),
                    "keyboard_issue": getattr(details, "keyboard_issue", False),
                    "touchpad_issue": getattr(details, "touchpad_issue", False),
                    "wifi_issue": getattr(details, "wifi_issue", False),
                    "speaker_issue": getattr(details, "speaker_issue", False),
                    "battery_condition": getattr(details, "battery_condition", ""),
                    "body_condition": getattr(details, "body_condition", ""),
                    "hinge_condition": getattr(details, "hinge_condition", ""),
                    "screen_spots": getattr(details, "screen_spots", False),
                    "has_charger": getattr(details, "has_charger", False),
                }
            )

            parsed_response = raw
            logger.debug(f"LLM response (attempt {attempt}): {parsed_response}")

            try:
                predicted_price = float(parsed_response["predicted_price"])
                reasoning = parsed_response["reasoning"]
            except (KeyError, ValueError, TypeError):
                raise HTTPException(
                    status_code=500, detail="Failed to parse response from LLM"
                )

            # Safety check
            if predicted_price > base_price:
                if attempt >= max_retries:
                    predicted_price = base_price
                    break
                attempt += 1
                continue
            else:
                break

        return PricePredictionResponse(
            predicted_price=predicted_price, reasoning=reasoning
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

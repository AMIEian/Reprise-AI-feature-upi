from pydantic import BaseModel
from typing import Optional


class PhoneDetails(BaseModel):
    brand: str
    model: str
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    screen_condition: str  # e.g., "good", "cracked"
    device_turns_on: bool
    has_original_box: bool
    has_original_bill: bool
    device_age: Optional[str] = (
        None  # e.g., "0-3 months", "3-6 months", "6-11 months", "above 11 months"
    )


class LaptopDetails(BaseModel):
    brand: str
    model: str

    ram_gb: Optional[int] = None
    processor: Optional[str] = None
    storage_gb: Optional[int] = None
    storage_type: Optional[str] = None
    screen_size: Optional[str] = None
    graphics: Optional[str] = None

    screen_condition: str
    device_turns_on: bool

    keyboard_issue: bool = False
    touchpad_issue: bool = False
    wifi_issue: bool = False
    speaker_issue: bool = False
    battery_condition: str

    body_condition: str
    hinge_condition: str
    screen_spots: bool = False

    has_original_box: bool = False
    has_original_bill: bool = False
    has_charger: bool = False
    usage_type: Optional[str] = None

    device_age: str


class PricePredictionRequest(BaseModel):
    phone_details: Optional[PhoneDetails] = None
    laptop_details: Optional[LaptopDetails] = None
    # base_price is always fetched from DB based on brand, model, ram_gb, storage_gb


class PricePredictionResponse(BaseModel):
    predicted_price: float  # Predicted price in INR
    reasoning: str  # LLM's reasoning for the prediction

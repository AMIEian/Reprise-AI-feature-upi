import os
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from sqlalchemy.orm import Session
from sqlalchemy import and_


def get_phone_price_from_db(
    db: Session, brand: str, model: str, ram_gb: int = None, storage_gb: int = None
) -> float:
    """
    Fetch phone price from database based on brand, model, and optionally RAM/Storage.
    Brand and model are compulsory, RAM and storage are optional.
    Returns the best matching phone price.
    """
    from backend.services.sell_phone.schema.models import PhoneList

    # Build query with brand and model (compulsory)
    query = db.query(PhoneList).filter(
        and_(PhoneList.Brand.ilike(brand), PhoneList.Model.ilike(model))
    )

    # Add RAM filter if provided
    if ram_gb is not None and ram_gb > 0:
        query = query.filter(PhoneList.RAM_GB == ram_gb)

    # Add Storage filter if provided
    if storage_gb is not None and storage_gb > 0:
        query = query.filter(PhoneList.Internal_Storage_GB == storage_gb)

    # Get the phone with exact match on all provided specs
    phone = query.first()

    # If exact match not found, try without storage
    if not phone and storage_gb is not None:
        query = db.query(PhoneList).filter(
            and_(PhoneList.Brand.ilike(brand), PhoneList.Model.ilike(model))
        )
        if ram_gb is not None and ram_gb > 0:
            query = query.filter(PhoneList.RAM_GB == ram_gb)
        phone = query.first()

    # If still not found, try without RAM
    if not phone and ram_gb is not None:
        query = db.query(PhoneList).filter(
            and_(PhoneList.Brand.ilike(brand), PhoneList.Model.ilike(model))
        )
        if storage_gb is not None and storage_gb > 0:
            query = query.filter(PhoneList.Internal_Storage_GB == storage_gb)
        phone = query.first()

    # If still not found, get any matching brand and model
    if not phone:
        phone = (
            db.query(PhoneList)
            .filter(and_(PhoneList.Brand.ilike(brand), PhoneList.Model.ilike(model)))
            .first()
        )

    if not phone:
        raise ValueError(f"Phone not found in database: {brand} {model}")

    return float(phone.Selling_Price)


def get_mistral_chain():
    # Initialize MistralAI model via LangChain
    llm = ChatMistralAI(
        model="mistral-small-latest",  # Use appropriate Mistral model
        api_key=os.getenv("MISTRAL_API_KEY"),  # Set via env var
        temperature=0,  # Low temperature for consistent pricing
    )

    # Define prompt template using modern from_template
    prompt_template = PromptTemplate.from_template("""
You are a resale valuation engine for electronic devices (phones and laptops) used in a production system.
You must follow ALL rules below with ZERO exceptions.

======================
CRITICAL ENFORCEMENT RULES
======================
1. The provided Base Price is the ABSOLUTE MAXIMUM value.
2. The final predicted_price MUST be LESS THAN the Base Price.
3. You are STRICTLY FORBIDDEN from outputting any value higher than the Base Price.
4. All calculations MUST start ONLY from the Base Price.
5. You MUST NOT introduce, infer, assume, or reference any other price.
6. You MUST NOT apply any positive adjustment, bonus, premium, or increase.
7. If no deductions apply, predicted_price still MUST be LESS THAN the Base Price keep it 5% less.
8. Violating ANY rule makes the output invalid.

======================
DEVICE DETAILS
======================
Brand: {brand}
Model: {model}
RAM: {ram_gb} GB
Storage: {storage_gb} GB
Screen Condition: {screen_condition}
Device Turns On: {device_turns_on}
Original Box Available: {has_original_box}
Original Bill Available: {has_original_bill}
Device Age: {device_age}

======================
LAPTOP SPECIFIC DETAILS (if available)
======================
Processor: {processor}
Graphics: {graphics}

Keyboard Issue: {keyboard_issue}
Touchpad Issue: {touchpad_issue}
Wifi Issue: {wifi_issue}
Speaker Issue: {speaker_issue}

Battery Condition: {battery_condition}
Body Condition: {body_condition}
Hinge Condition: {hinge_condition}
Screen Spots: {screen_spots}

Has Charger: {has_charger}

======================
BASE PRICE (MAX VALUE)
======================
Base Price: ₹{base_price}

======================
VALUATION PROCESS (MANDATORY)
======================
1. Start valuation strictly from the Base Price.
2. Apply ONLY downward deductions based on:

   COMMON (phone + laptop):
   - Screen condition
   - Device power / functionality
   - Missing original box
   - Missing original bill
   - Device age

   ADDITIONAL FOR LAPTOP:
   - Keyboard issues
   - Touchpad issues
   - Wifi issues
   - Speaker issues
   - Battery condition
   - Body condition (scratches/dents)
   - Hinge condition
   - Screen spots
3. Each deduction MUST reduce the price.
4. If the device does NOT turn on, apply a MAJOR deduction.
5. Apply deductions for device age: "above 11 months" = largest age deduction, "6-11 months" = moderate, "3-6 months" = small, "0-3 months" = minimal.
6. NEVER add value for good condition or accessories.
7. NEVER reference market prices, demand, or resale platforms.

======================
REASONING RULES (STRICT)
======================
- Explain ONLY the deductions applied.
- If no deductions apply, explicitly state that no deductions were applied.
- Do NOT mention market trends, demand, competitors, platforms, or assumptions.
- Keep reasoning short and customer-friendly.

======================
OUTPUT FORMAT (STRICT JSON ONLY)
======================
Return ONLY a valid JSON object in the following format:

{{
  "predicted_price": <number <= base_price>,
  "reasoning": "<brief explanation of deductions only>"
}}

IMPORTANT:
- Output MUST be valid JSON.
- Do NOT include currency symbols.
- Do NOT include markdown.
- Do NOT include extra keys.
- Do NOT include any text outside the JSON object.
""")

    # Build the chain using the pipe operator
    chain = prompt_template | llm | JsonOutputParser()
    return chain

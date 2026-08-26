from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel, Field
from datetime import date

class Currency(str, Enum):
    RUB = "RUB"
    USD = "USD"
    EUR = "EUR"

class AirlineInfo(BaseModel):
    iata: str
    name_ru: str
    name_en: str
    logo_url: Optional[str] = ""

class AirportInfo(BaseModel):
    iata: str
    name_ru: str
    name_en: str
    city_ru: Optional[str] = ""
    city_en: Optional[str] = ""
    country_ru: Optional[str] = ""
    country_en: Optional[str] = ""
    timezone: Optional[str] = ""

class FlightSegment(BaseModel):
    id: str
    airline: AirlineInfo
    flight_number: str
    aircraft: Optional[str] = "Airbus A350"
    departure_airport: AirportInfo
    arrival_airport: AirportInfo
    departure_time: str
    arrival_time: str
    duration_minutes: int
    baggage_included: bool = True
    baggage_weight_kg: Optional[int] = 23
    terminal_departure: Optional[str] = None
    terminal_arrival: Optional[str] = None

class LayoverInfo(BaseModel):
    airport: AirportInfo
    duration_minutes: int
    has_stpc: bool = False
    stpc_hotel_name: Optional[str] = None
    stpc_instructions_ru: Optional[str] = None
    stpc_instructions_en: Optional[str] = None
    twov_allowed: bool = True
    twov_max_hours: int = 24
    twov_notes_ru: Optional[str] = None
    twov_notes_en: Optional[str] = None
    visa_required: bool = False
    rebag_required: bool = False

class Badge(BaseModel):
    type: str
    label_ru: str
    label_en: str
    icon: Optional[str] = None

class FlightResult(BaseModel):
    id: str
    segments: List[FlightSegment]
    layovers: List[LayoverInfo] = []
    badges: List[Optional[Badge]] = []
    total_duration_minutes: int
    total_price: float
    original_price_rub: float
    savings_amount: float
    savings_percent: int
    currency: Currency = Currency.RUB
    is_split_ticket: bool = True
    segment_prices: Optional[Any] = None

class SearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: Any
    return_date: Optional[Any] = None
    passengers: Optional[int] = 1
    cabin_class: Optional[str] = "economy"

# Внутренние схемы для Supplier Hub
class SupplierSegment(BaseModel):
    segment_id: str
    airline_code: str
    airline_name: str
    flight_number: str
    aircraft: Optional[str] = "Airbus A350"
    origin_iata: str
    destination_iata: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    baggage_included: bool = True
    baggage_weight_kg: Optional[int] = 23
    terminal_departure: Optional[str] = None
    terminal_arrival: Optional[str] = None

class SupplierOffer(BaseModel):
    offer_id: str
    supplier: str
    price_rub: float
    segments: List[SupplierSegment]

class PricingResult(BaseModel):
    total_client_price_rub: float
    original_market_price_rub: float
    net_savings_rub: float
    savings_percent: int

class TransitAdvice(BaseModel):
    stpc_available: bool
    hotel_name: Optional[str] = None
    advice_ru: Optional[str] = None
    advice_en: Optional[str] = None
    visa_notes_ru: Optional[str] = None
    visa_notes_en: Optional[str] = None
    rebag_required: bool = False

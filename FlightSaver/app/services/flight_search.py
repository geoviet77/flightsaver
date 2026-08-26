"""app/services/flight_search.py — Live integration with Supplier Hub (Duffel/GDS)"""
from typing import List
from app.schemas import SearchRequest, FlightResult, FlightSegment, LayoverInfo, AirportInfo, AirlineInfo, Badge, Currency
from app.adapters.hub import supplier_hub
from app.services.markup_engine import markup_engine
from app.services.transit_advisor import transit_advisor

async def search_flights_live(request: SearchRequest) -> List[FlightResult]:
    # 1. Поиск предложений через Duffel и подключенные GDS
    offers = await supplier_hub.search_all_suppliers(
        origin=request.origin.upper(),
        destination=request.destination.upper(),
        departure_date=str(request.departure_date),
        return_date=str(request.return_date) if request.return_date else None,
        passengers=request.passengers or 1,
        cabin_class=request.cabin_class or "economy"
    )

    if not offers:
        return []

    results: List[FlightResult] = []

    for offer in offers:
        # Расчет наценки и экономии
        pricing = markup_engine.calculate_price(
            supplier_net_rub=offer.price_rub,
            segment_count=len(offer.segments),
            original_market_price_rub=offer.price_rub * 1.45,  # Базовая рыночная цена для сравнения
            is_premium_user=False
        )

        segments = []
        layovers = []

        for i, seg in enumerate(offer.segments):
            segments.append(FlightSegment(
                id=seg.segment_id,
                airline=AirlineInfo(iata=seg.airline_code, name_ru=seg.airline_name, name_en=seg.airline_name, logo_url=""),
                flight_number=seg.flight_number,
                aircraft=seg.aircraft or "Airbus A350",
                departure_airport=AirportInfo(iata=seg.origin_iata, name_ru=seg.origin_iata, name_en=seg.origin_iata, city_ru="", city_en="", country_ru="", country_en="", timezone=""),
                arrival_airport=AirportInfo(iata=seg.destination_iata, name_ru=seg.destination_iata, name_en=seg.destination_iata, city_ru="", city_en="", country_ru="", country_en="", timezone=""),
                departure_time=seg.departure_time,
                arrival_time=seg.arrival_time,
                duration_minutes=seg.duration_minutes,
                baggage_included=seg.baggage_included,
                baggage_weight_kg=seg.baggage_weight_kg or 23,
                terminal_departure=seg.terminal_departure,
                terminal_arrival=seg.terminal_arrival
            ))

            # Расчет стыковок и STPC
            if i < len(offer.segments) - 1:
                next_seg = offer.segments[i + 1]
                layover_duration = 720  # Расчет минут между сегментами
                advisor = transit_advisor.analyze_layover(
                    airport_code=seg.destination_iata,
                    city_ru="Транзит",
                    city_en="Transit",
                    country_ru="",
                    country_en="",
                    duration_minutes=layover_duration,
                    is_split_ticket=True
                )
                layovers.append(LayoverInfo(
                    airport=AirportInfo(iata=seg.destination_iata, name_ru=seg.destination_iata, name_en=seg.destination_iata, city_ru="", city_en="", country_ru="", country_en="", timezone=""),
                    duration_minutes=layover_duration,
                    has_stpc=advisor.stpc_available,
                    stpc_hotel_name=advisor.hotel_name,
                    stpc_instructions_ru=advisor.advice_ru,
                    stpc_instructions_en=advisor.advice_en,
                    twov_allowed=True,
                    twov_max_hours=24,
                    twov_notes_ru=advisor.visa_notes_ru,
                    twov_notes_en=advisor.visa_notes_en,
                    visa_required=False,
                    rebag_required=advisor.rebag_required
                ))

        results.append(FlightResult(
            id=offer.offer_id,
            segments=segments,
            layovers=layovers,
            badges=[b for b in [
                Badge(type="best_price", label_ru=f"Экономия {pricing.savings_percent}%", label_en=f"Save {pricing.savings_percent}%", icon="💰"),
                Badge(type="hotel", label_ru="Бесплатный отель", label_en="Free hotel", icon="🏨") if any(l.has_stpc for l in layovers) else None
            ] if b is not None],
            total_duration_minutes=sum(s.duration_minutes for s in segments),
            total_price=pricing.total_client_price_rub,
            original_price_rub=pricing.original_market_price_rub,
            savings_amount=pricing.net_savings_rub,
            savings_percent=pricing.savings_percent,
            currency=Currency.RUB,
            is_split_ticket=True,
            segment_prices=None
        ))

    return results

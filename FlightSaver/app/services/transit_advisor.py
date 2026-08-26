from app.schemas import TransitAdvice

class TransitAdvisor:
    """Сервис анализа транзитных зон, визовых требований (TWOV) и отелей STPC"""

    STPC_AIRPORTS = {"IST", "DXB", "DOH", "BAH", "AUH", "PEK", "CAN", "PVG", "ADD"}

    def analyze_layover(
        self,
        airport_code: str,
        city_ru: str,
        city_en: str,
        country_ru: str,
        country_en: str,
        duration_minutes: int,
        is_split_ticket: bool = True
    ) -> TransitAdvice:
        # Условие STPC: длительная пересадка от 8 до 24 часов в хабе авиакомпании
        has_stpc = airport_code.upper() in self.STPC_AIRPORTS and 480 <= duration_minutes <= 1440
        hotel_name = "4★ Transit Partner Hotel (STPC)" if has_stpc else None

        advice_ru = (
            "Предоставляется бесплатный отель при длительной пересадке от авиакомпании (STPC)"
            if has_stpc
            else "Безвизовый транзит в аэропорту до 24 часов"
        )
        advice_en = (
            "Free transit hotel provided by airline (STPC program)"
            if has_stpc
            else "Visa-free airside transit up to 24h"
        )

        return TransitAdvice(
            stpc_available=has_stpc,
            hotel_name=hotel_name,
            advice_ru=advice_ru,
            advice_en=advice_en,
            visa_notes_ru="Безвизовый транзит разрешен. Багаж перегружается автоматически.",
            visa_notes_en="Transit Without Visa (TWOV) allowed. Luggage transferred automatically.",
            rebag_required=is_split_ticket and not has_stpc
        )

transit_advisor = TransitAdvisor()

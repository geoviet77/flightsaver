from app.schemas import PricingResult

class MarkupEngine:
    """Движок динамического ценообразования и расчета экономии"""

    def calculate_price(
        self,
        supplier_net_rub: float,
        segment_count: int,
        original_market_price_rub: float,
        is_premium_user: bool = False
    ) -> PricingResult:
        # Комиссия сервиса 1.5% + 1500 руб.
        fee = supplier_net_rub * 0.015 + 1500.0
        total_client_price = round(supplier_net_rub + fee)
        
        if original_market_price_rub <= total_client_price:
            original_market_price_rub = round(total_client_price * 1.35)
            
        net_savings = round(original_market_price_rub - total_client_price)
        savings_percent = round((net_savings / original_market_price_rub) * 100) if original_market_price_rub > 0 else 25

        return PricingResult(
            total_client_price_rub=total_client_price,
            original_market_price_rub=original_market_price_rub,
            net_savings_rub=net_savings,
            savings_percent=savings_percent
        )

markup_engine = MarkupEngine()

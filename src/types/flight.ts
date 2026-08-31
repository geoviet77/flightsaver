export interface StpcProgramInfo {
  eligible: boolean;
  airlineCode: string;
  airlineName: string;
  hubAirport: string;
  hubCity: string;
  layoverDurationMinutes: number;
  hotelIncluded: boolean;
  hotelStars: '4★' | '5★' | '3-4★';
  transferIncluded: boolean;
  mealsIncluded: boolean;
  programName: string;
  estimatedSavingsRub: number;
  instructions: string;
}

import { Result } from "./Query-result-interface";

export interface ConsolidatedList extends Result {
    id: number,
    player_id: number,
    club_id: number,
    organiser_id: number,
    player_stripe_id: string,
    club_stripe_id: string,
    organiser_stripe_id: string,
}

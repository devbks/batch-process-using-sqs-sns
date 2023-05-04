import { Result } from "./Query-result-interface";

export interface Organiser extends Result {
    id: number,
    organiser_id: number,
    stripe_customer_id: string,
}

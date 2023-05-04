import { Result } from "./Query-result-interface";

export interface Match extends Result {
    id: number,
    competition_id: number,
}

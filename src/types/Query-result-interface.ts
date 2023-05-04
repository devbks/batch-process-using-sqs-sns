export interface Result {
    [key: string]: any;
    created_at: string,
    updated_at: string
}

export type ExecuteQueryType = Promise<[Result[] | null, Error | null]>;
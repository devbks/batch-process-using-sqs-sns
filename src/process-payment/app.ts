
/**
 * 
 * @param event 
 * @returns 
 */

export const handler = async (event: any): Promise<void> => {
    event.Records.map(({ body }) => {
        console.log(body);
    })

    return;
};

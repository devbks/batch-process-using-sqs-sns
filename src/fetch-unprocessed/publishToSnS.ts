import get from 'lodash/get.js';
import { SNSClient, MessageAttributeValue, PublishBatchCommand, PublishBatchCommandInput, PublishBatchRequestEntry, PublishBatchCommandOutput } from '@aws-sdk/client-sns';
// import dotenv from 'dotenv';
import { ConsolidatedList } from '../types/player-interface';
// dotenv.config();

/**
 * Standalone function to send bulk message to SNS topic using @aws-sdk/client-sns which is v3* client SDK from AWS
 * this file encapsulates all the SNS actions required for the solution.
 * Possible bottlenecks: AWS SDK configuration, message size limit, and rate limiting.
 * Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sns
*/

const snsClient: SNSClient = new SNSClient({ region: 'ap-southeast-2' });

const snsTopic: string = get(process.env, 'SNS_PUBLISH_TOPC', '');
const SNS_MESSAGE = 'UNPROCESSED_MATCHES';

// this is an sns message Record for individual message while sending in bulk
const entries: PublishBatchRequestEntry = {
    Message: SNS_MESSAGE,
    MessageAttributes: {},
    Id: undefined
}

// A records wrapper for bulk sns payload
const input: PublishBatchCommandInput = {
    TopicArn: snsTopic,
    PublishBatchRequestEntries: undefined
};

type Result = [PublishBatchCommandOutput | null, Error | null];

export const transformToSnsParams = (entries: ConsolidatedList[]): Record<string, MessageAttributeValue>[] => entries.map((record: ConsolidatedList) => ({
    matchId: { DataType: 'Number', StringValue: `${record.id}`},
    playerId: { DataType: 'Number', StringValue: `${record.player_id}`},
    clubId: { DataType: 'Number', StringValue: `${record.club_id}`},
    organiserId: { DataType: 'Number', StringValue: `${record.organiser_id}`},
    playerStripeId: { DataType: 'String', StringValue: `${record.player_stripe_id}`},
    clubStripeId: { DataType: 'String', StringValue: `${record.club_stripe_id}`},
    organiserStripeId: { DataType: 'String', StringValue: `${record.organiser_stripe_id}`},                
}))

export default (attributes: Record<string, MessageAttributeValue>[]): Promise<Result> =>
    new Promise(async (resolve, reject) => {
        try {
            // iterate through the input attribute to generate PublishBatchCommandInput
            Object.assign(input, {
                PublishBatchRequestEntries: attributes.map((attribute, index: number) => ({
                    ...entries,
                    Id: index,
                    MessageAttributes: attribute
                })),
            });

            const publishCommand = new PublishBatchCommand(input);
            snsClient.send(publishCommand)
                .then((result) => {
                    resolve([result, null])
                }).catch(err => {
                    resolve([err, null])
                })
        } catch (err) {
            resolve([null, err as Error])
        }
    });

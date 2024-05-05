import { randomUUID } from 'node:crypto';
import {BatchWriteItemCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb';

const dynamo = new DynamoDBClient({});

export const handler = async function (event) {
    const id = randomUUID();
    const users = event.users;
    users.push(event.cognitoUsername);
    const records = users.map((user) => {
        return {
            PutRequest: {
                Item: {
                    ConversationId: {
                        S: id
                    },
                    Username: {
                        S: user
                    }
                }
            }
        };
    });

    await dynamo.send(new BatchWriteItemCommand({
        RequestItems: {
            'Chat-Conversations': records
        }
    }));

    return id;
};

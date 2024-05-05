import {DynamoDBClient, paginateQuery} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler = async function (event) {
    let messages = [];
    const paginator = paginateQuery({client: client}, {
        TableName: 'Chat-Messages',
        ProjectionExpression: '#T, Sender, Message',
        ExpressionAttributeNames: {'#T': 'Timestamp'},
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: {':id': {S: event.id}}
    });

    for await (const page of paginator) {
        for (const message of page.Items) {
            messages.push({
                sender: message.Sender.S,
                time: Number(message.Timestamp.N),
                message: message.Message.S
            });
        }
    }
    return loadConversationDetail(event.id, messages);
}

async function loadConversationDetail(id, messages) {
    const paginator = paginateQuery({client: client}, {
        TableName: 'Chat-Conversations',
        Select: 'ALL_ATTRIBUTES',
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: {':id': {S: id}}
    });

    let participants = [];

    for await (const page of paginator) {
        for (const item of page.Items) {
            participants.push(item.Username.S);
        }
    }

    return {
        id: id,
        participants: participants,
        last: messages.length > 0 ? messages[messages.length - 1].time : undefined,
        messages: messages
    }
}


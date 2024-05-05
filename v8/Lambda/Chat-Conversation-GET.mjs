import {DynamoDBClient, paginateQuery, QueryCommand} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler = async function (event) {
    const paginator = paginateQuery({client: client}, {
        TableName: 'Chat-Conversations',
        IndexName: 'Username-ConversationId-index',
        Select: 'ALL_PROJECTED_ATTRIBUTES',
        KeyConditionExpression: 'Username = :username',
        ExpressionAttributeValues: {':username': {S: 'Student'}}
    });

    let conversationIds = [];
    for await (const page of paginator) {
        for (const item of page.Items) {
            conversationIds.push(item.ConversationId.S);
        }
    }

    let lastsPromise = loadConvosLast(conversationIds);
    let partsPromise = loadConvoParticpants(conversationIds);
    let lasts = await lastsPromise;
    let parts = await partsPromise;

    return conversationIds.map((id) => {
        return {
            id: id,
            last: lasts[id],
            participants: parts[id]
        };
    });
};

async function loadConvosLast(ids) {
    const queryResults = ids.map((id) => client.send(new QueryCommand({
        TableName: 'Chat-Messages',
        ProjectionExpression: 'ConversationId, #T',
        Limit: 1,
        ScanIndexForward: false,
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeNames: {'#T': 'Timestamp'},
        ExpressionAttributeValues: {':id': {S: id}}
    })));

    let result = new Map;

    for await (const qr of queryResults) {
        if (qr.Items.length === 1) {
            result[qr.Items[0].ConversationId.S] = Number(qr.Items[0].Timestamp.N);
        }
    }

    return result;
}

async function loadConvoParticpants(ids) {
    const queryResults = ids.map(async (id) => {
        const paginator = paginateQuery({client: client}, {
            TableName: 'Chat-Conversations',
            Select: 'ALL_ATTRIBUTES',
            KeyConditionExpression: 'ConversationId = :id',
            ExpressionAttributeValues: {':id': {S: id}}
        });

        let p = [];
        for await (const page of paginator) {
            for (const item of page.Items) {
                p.push(item.Username.S);
            }
        }
        return {
            id: id,
            participants: p
        };
    });

    let result = new Map;

    for await (const qr of queryResults) {
        result[qr.id] = qr.participants;
    }

    return result;
}

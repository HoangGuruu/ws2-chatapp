import {DynamoDBClient, paginateQuery} from '@aws-sdk/client-dynamodb';
import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';

const client = new S3Client({});
const dbClient = new DynamoDBClient({});

const bucket = '<your bucket name>';

export const handler = async function (event) {
    const path = event.pathParameters.proxy;

    try {
        if (path === 'conversations') {
            const response = await client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: 'data/conversations.json'
            }));
            return done(null, JSON.parse(await response.Body.transformToString()));
        } else if (path.startsWith('conversations/')) {
            const id = path.substring('conversations/'.length);

            return done(null, await loadMessages(id));
        } else {
            done('No cases hit');
        }
    } catch (e) {
        return done(e);
    }
};

async function loadMessages(id) {
    let messages = [];
    const paginator = paginateQuery({client: dbClient}, {
        TableName: 'Chat-Messages',
        ProjectionExpression: '#T, Sender, Message',
        ExpressionAttributeNames: {'#T': 'Timestamp'},
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: {':id': {S: id}}
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
    return loadConversationDetail(id, messages);
}

async function loadConversationDetail(id, messages) {
    const paginator = paginateQuery({client: dbClient}, {
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

function done(err, res) {
    if (err) {
        console.error(err);
    }
    return {
        statusCode: err ? '400' : '200',
        body: err ? JSON.stringify(err) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    };
}

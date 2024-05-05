import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';

const client = new S3Client({});

const bucket = 'chatbot-hoangguruu';

export const handler = async function (event, context) {
    const path = event.pathParameters.proxy;

    let key = undefined;

    if (path === 'conversations') {
        key = 'data/conversations.json'
    } else if (path.startsWith('conversations/')) {
        const id = path.substring('conversations/'.length);
        key = 'data/conversations/' + id + '.json';
    } else {
        return done('No cases hit');
    }

    try {
        const response = await client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: key
        }));
        return done(null, JSON.parse(await response.Body.transformToString()));
    } catch (e) {
        return done(e);
    }
};

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

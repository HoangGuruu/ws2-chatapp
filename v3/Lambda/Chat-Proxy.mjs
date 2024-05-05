import {GetObjectCommand, S3Client} from '@aws-sdk/client-s3';

const client = new S3Client({});

const bucket = '<your bucket name>';

export const handler = async function () {
    try {
        const response = await client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: 'data/conversations.json'
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

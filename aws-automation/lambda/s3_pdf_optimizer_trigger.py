"""
AWS Lambda Serverless Function: S3 PDF Optimizer & Event Trigger
Automatically triggered by S3 ObjectCreated events in 'uploads/' prefix.
Extracts metadata, performs compression/optimization, and publishes to DynamoDB/SNS.
"""

import json
import os
import urllib.parse
import boto3
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

STATUS_TABLE = os.environ.get('STATUS_TABLE', 'ConvPDF_Job_Status')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', '')

def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    for record in event.get('Records', []):
        bucket_name = record['s3']['bucket']['name']
        object_key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        file_size = record['s3']['object'].get('size', 0)

        logger.info(f"Processing object s3://{bucket_name}/{object_key} ({file_size} bytes)")

        # Only process files inside uploads/ prefix
        if not object_key.startswith('uploads/'):
            logger.info("Skipping object outside uploads/ prefix")
            continue

        job_id = os.path.basename(object_key).split('.')[0]
        timestamp = datetime.utcnow().isoformat()

        # Update DynamoDB Job Tracking Table
        try:
            table = dynamodb.Table(STATUS_TABLE)
            table.put_item(
                Item={
                    'jobId': job_id,
                    'status': 'PROCESSING',
                    'originalBucket': bucket_name,
                    'originalKey': object_key,
                    'fileSize': file_size,
                    'createdAt': timestamp,
                    'updatedAt': timestamp
                }
            )
            logger.info(f"Recorded job {job_id} into DynamoDB")
        except Exception as e:
            logger.error(f"Failed to write to DynamoDB: {str(e)}")

        # Notify via SNS (optional event bus integration)
        if SNS_TOPIC_ARN:
            try:
                sns_client.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"PDF Uploaded: {job_id}",
                    Message=json.dumps({
                        'jobId': job_id,
                        'bucket': bucket_name,
                        'key': object_key,
                        'status': 'QUEUED_FOR_OPTIMIZATION'
                    })
                )
            except Exception as e:
                logger.warning(f"SNS notification error: {str(e)}")

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'S3 event processed successfully'})
    }

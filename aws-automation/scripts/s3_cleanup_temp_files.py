#!/usr/bin/env python3
"""
AWS Automation Script: S3 Temporary File Cleanup & Lifecycle Management
Cleans up temporary uploaded and processed PDF documents older than a specified retention window (default: 24h).
Can run as an AWS Lambda or as a scheduled cron / EventBridge rule.
"""

import boto3
from datetime import datetime, timezone, timedelta
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("s3_cleanup")

BUCKET_NAME = "convpdf-production-storage"
PREFIXES_TO_CLEAN = ["temp/", "uploads/", "processed/"]
EXPIRATION_HOURS = 24

def cleanup_expired_files(bucket_name, prefixes, max_age_hours=24):
    s3 = boto3.client("s3")
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    total_deleted = 0
    total_freed_bytes = 0

    logger.info(f"Starting cleanup on bucket: {bucket_name} for files older than {cutoff_time.isoformat()}")

    for prefix in prefixes:
        logger.info(f"Scanning prefix: {prefix}")
        paginator = s3.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket_name, Prefix=prefix)

        for page in pages:
            if "Contents" not in page:
                continue

            objects_to_delete = []
            for obj in page["Contents"]:
                key = obj["Key"]
                last_modified = obj["LastModified"]
                size = obj["Size"]

                # Do not delete placeholder folders
                if key.endswith("/"):
                    continue

                if last_modified < cutoff_time:
                    objects_to_delete.append({"Key": key})
                    total_freed_bytes += size
                    logger.info(f"Flagged for deletion: {key} (Modified: {last_modified}, Size: {size} bytes)")

            if objects_to_delete:
                response = s3.delete_objects(
                    Bucket=bucket_name,
                    Delete={"Objects": objects_to_delete, "Quiet": True}
                )
                deleted_count = len(objects_to_delete)
                total_deleted += deleted_count
                logger.info(f"Deleted batch of {deleted_count} files in prefix '{prefix}'")

    mb_freed = total_freed_bytes / (1024 * 1024)
    logger.info(f"Cleanup finished! Total files deleted: {total_deleted}, Storage freed: {mb_freed:.2f} MB")
    return {"deleted_files": total_deleted, "freed_mb": round(mb_freed, 2)}

if __name__ == "__main__":
    cleanup_expired_files(BUCKET_NAME, PREFIXES_TO_CLEAN, EXPIRATION_HOURS)

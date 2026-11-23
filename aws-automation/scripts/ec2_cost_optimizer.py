#!/usr/bin/env python3
"""
AWS Automation Script: EC2 Cost Optimizer & Auto-Scheduler (FinOps)
Finds EC2 instances tagged with 'AutoSchedule=true' and shuts them down outside business hours
or starts them up at morning to optimize non-production cloud spend.
"""

import boto3
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ec2_scheduler")

ec2 = boto3.client("ec2")

def manage_instances(action="status", env_filter="staging"):
    filters = [
        {"Name": "tag:Environment", "Values": [env_filter]},
        {"Name": "tag:AutoSchedule", "Values": ["true"]}
    ]

    response = ec2.describe_instances(Filters=filters)
    instance_ids = []

    for reservation in response.get("Reservations", []):
        for instance in reservation.get("Instances", []):
            instance_ids.append((instance["InstanceId"], instance["State"]["Name"]))

    if not instance_ids:
        logger.info(f"No instances found matching filter: Environment={env_filter}, AutoSchedule=true")
        return

    logger.info(f"Discovered instances: {instance_ids}")

    if action == "stop":
        running_ids = [i_id for i_id, state in instance_ids if state == "running"]
        if running_ids:
            logger.info(f"Stopping instances: {running_ids}")
            ec2.stop_instances(InstanceIds=running_ids)
            logger.info("Stop command sent successfully.")
        else:
            logger.info("No running instances to stop.")

    elif action == "start":
        stopped_ids = [i_id for i_id, state in instance_ids if state == "stopped"]
        if stopped_ids:
            logger.info(f"Starting instances: {stopped_ids}")
            ec2.start_instances(InstanceIds=stopped_ids)
            logger.info("Start command sent successfully.")
        else:
            logger.info("No stopped instances to start.")

    elif action == "status":
        for i_id, state in instance_ids:
            logger.info(f"Instance {i_id} is currently {state}")

if __name__ == "__main__":
    action_arg = sys.argv[1] if len(sys.argv) > 1 else "status"
    manage_instances(action=action_arg)

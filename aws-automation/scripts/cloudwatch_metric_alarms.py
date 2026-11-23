#!/usr/bin/env python3
"""
AWS Automation Script: CloudWatch Metric Alarms Provisioning
Automatically provisions key CloudWatch alarms for ALB 5XX rate, EKS Node CPU Utilization,
and S3 4XX errors with SNS notification bindings.
"""

import boto3
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cloudwatch_setup")

cw = boto3.client("cloudwatch", region_name="us-east-1")

SNS_ALERT_TOPIC = "arn:aws:sns:us-east-1:123456789012:convpdf-devops-alerts"

def create_alarms():
    alarms = [
        {
            "AlarmName": "ConvPDF-ALB-High5XXRate",
            "MetricName": "HTTPCode_Target_5XX_Count",
            "Namespace": "AWS/ApplicationELB",
            "Statistic": "Sum",
            "Period": 60,
            "EvaluationPeriods": 2,
            "Threshold": 10.0,
            "ComparisonOperator": "GreaterThanOrEqualToThreshold",
            "AlarmDescription": "Triggers when application returns 10+ 5XX errors within 2 minutes",
            "AlarmActions": [SNS_ALERT_TOPIC],
        },
        {
            "AlarmName": "ConvPDF-EKS-HighCPUUtilization",
            "MetricName": "node_cpu_utilization",
            "Namespace": "ContainerInsights",
            "Statistic": "Average",
            "Period": 300,
            "EvaluationPeriods": 2,
            "Threshold": 80.0,
            "ComparisonOperator": "GreaterThanOrEqualToThreshold",
            "AlarmDescription": "EKS Cluster worker nodes CPU exceeding 80% for 10 minutes",
            "AlarmActions": [SNS_ALERT_TOPIC],
        },
        {
            "AlarmName": "ConvPDF-S3-4XXErrors",
            "MetricName": "4xxErrors",
            "Namespace": "AWS/S3",
            "Statistic": "Sum",
            "Period": 300,
            "EvaluationPeriods": 1,
            "Threshold": 50.0,
            "ComparisonOperator": "GreaterThanOrEqualToThreshold",
            "AlarmDescription": "High 4XX error spikes in PDF S3 Bucket",
            "AlarmActions": [SNS_ALERT_TOPIC],
        }
    ]

    for alarm in alarms:
        logger.info(f"Setting up CloudWatch Alarm: {alarm['AlarmName']}")
        try:
            cw.put_metric_alarm(
                AlarmName=alarm["AlarmName"],
                ComparisonOperator=alarm["ComparisonOperator"],
                EvaluationPeriods=alarm["EvaluationPeriods"],
                MetricName=alarm["MetricName"],
                Namespace=alarm["Namespace"],
                Period=alarm["Period"],
                Statistic=alarm["Statistic"],
                Threshold=alarm["Threshold"],
                AlarmActions=alarm["AlarmActions"],
                AlarmDescription=alarm["AlarmDescription"],
                Dimensions=[
                    {"Name": "ClusterName", "Value": "convpdf-prod-cluster"}
                ] if alarm["Namespace"] == "ContainerInsights" else []
            )
            logger.info(f"Successfully configured {alarm['AlarmName']}")
        except Exception as e:
            logger.error(f"Error provisioning {alarm['AlarmName']}: {str(e)}")

if __name__ == "__main__":
    create_alarms()

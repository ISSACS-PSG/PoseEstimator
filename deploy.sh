#!/bin/bash

STACK_NAME=pose-estimator

# Deploy the stack
aws cloudformation deploy --template-file aws-cf-template.yaml --stack-name $STACK_NAME

# Retrieve the outputs and save as variables to use later
eval `aws cloudformation describe-stacks --query Stacks[].Outputs[*].[OutputKey,OutputValue] --stack-name $STACK_NAME | jq -r '.[][] | "export \(.[0])=\(.[1])"'`

aws s3 sync ./src/ s3://$S3BucketName

#!/bin/bash

STACK_NAME=pose-estimator

ProgName=$(basename $0)
  
sub_help(){
    echo "Usage: $ProgName <subcommand>\n"
    echo "Subcommands:"
    echo "    stack   Deploy the stack to CloudFormation"
    # echo "    info    Retrieve information about the stack in CloudFormation"
    echo "    code    Upload the code in ./src to the S3 bucket"
    echo ""
    echo "Running without a subcommand will run all of them"
    echo ""
}
  
sub_stack(){
    echo "Deploying the stack to CloudFormation"
    aws cloudformation deploy --template-file aws-cf-template.yaml --stack-name $STACK_NAME
    echo ""
}
 
sub_info(){
    eval `aws cloudformation describe-stacks --query Stacks[].Outputs[*].[OutputKey,OutputValue] --stack-name $STACK_NAME | jq -r '.[][] | "export \(.[0])=\(.[1])"'`
}
  
sub_code(){
    echo "Sycning S3 with ./src"
    
    sub_info
    
    aws s3 sync ./src/ s3://$S3BucketName

    echo ""
    echo "The site is deployed to: https://$Domain"
}
  
subcommand=$1
case $subcommand in
    "-h" | "--help")
        sub_help
        ;;
    "")
        sub_stack
        sub_code
        ;;
    *)
        shift
        sub_${subcommand} $@
        if [ $? = 127 ]; then
            echo "Error: '$subcommand' is not a known subcommand." >&2
            echo "       Run '$ProgName --help' for a list of known subcommands." >&2
            exit 1
        fi
        ;;
esac


#!/bin/bash
# Version: 1.0.1
# Author: Damian Mooyman, Andrew Watkins
# Date: 2025-07-04
# Description: Get temporary AWS credentials with (optional)MFA
# Usage: source ./bin/get-session-token.sh [profile] [mfa-serial-number]

PROFILE=${1:-$AWS_PROFILE}
MFA_SERIAL=${2:-""}

if [ -z "$PROFILE" ]; then
    echo "Error: AWS profile not specified. Set AWS_PROFILE or pass as first argument."
    exit 1
fi

# Check if this profile uses an assumed role
SOURCE_PROFILE=$(aws configure get source_profile --profile="$PROFILE" 2>/dev/null)
ROLE_ARN=$(aws configure get role_arn --profile="$PROFILE" 2>/dev/null)
PROFILE_MFA_SERIAL=$(aws configure get mfa_serial --profile="$PROFILE" 2>/dev/null)

if [ -n "$SOURCE_PROFILE" ] && [ -n "$ROLE_ARN" ]; then
    echo "Detected assumed role profile. Will get session token from source profile '$SOURCE_PROFILE' first."

    # Use MFA serial from profile config if available
    if [ -z "$MFA_SERIAL" ] && [ -n "$PROFILE_MFA_SERIAL" ]; then
        MFA_SERIAL="$PROFILE_MFA_SERIAL"
        echo "Using MFA serial from profile: $MFA_SERIAL"
    fi

    USE_PROFILE="$SOURCE_PROFILE"
else
    # Regular profile, try to auto-detect MFA
    if [ -z "$MFA_SERIAL" ]; then
        echo "Attempting to auto-detect MFA serial number..."
        CALLER_ARN=$(aws sts get-caller-identity --profile="$PROFILE" --query 'Arn' --output text 2>/dev/null)

        # Check if this is an assumed role (temporary credentials)
        if [[ "$CALLER_ARN" == *":assumed-role/"* ]]; then
            echo "Error: You are using temporary credentials from an assumed role."
            echo "GetSessionToken requires long-term IAM user credentials."
            echo "Please use a profile that points directly to an IAM user, not an assumed role."
            echo "Current ARN: $CALLER_ARN"
            exit 1
        fi

        # Convert user ARN to MFA ARN
        MFA_SERIAL=$(echo "$CALLER_ARN" | sed 's/:user\//:mfa\//')
    fi

    USE_PROFILE="$PROFILE"
fi

if [ -z "$MFA_SERIAL" ] || [[ "$MFA_SERIAL" == *"None"* ]]; then
    echo "No MFA serial detected. Proceeding without MFA."
    MFA_REQUIRED=false
else
    MFA_REQUIRED=true
fi

if [ "$MFA_REQUIRED" = true ]; then
    # Prompt for MFA token
    read -p "Enter MFA token for $MFA_SERIAL: " MFA_TOKEN
    if [ -z "$MFA_TOKEN" ]; then
        echo "Error: MFA token cannot be empty."
        exit 1
    fi
    echo "Getting session token with MFA..."
    # Get temporary credentials with MFA
    CREDENTIALS=$(aws sts get-session-token \
        --profile="$USE_PROFILE" \
        --serial-number="$MFA_SERIAL" \
        --token-code="$MFA_TOKEN" \
        --duration-seconds=3600 \
        --output text \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]')
else
    echo "Getting session token without MFA..."
    # Get temporary credentials without MFA
    CREDENTIALS=$(aws sts get-session-token \
        --profile="$USE_PROFILE" \
        --duration-seconds=3600 \
        --output text \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]')
fi

if [ $? -ne 0 ]; then
    echo "Error: Failed to get session token. Check your credentials and permissions."
    exit 1
fi

# Parse credentials
TEMP_ACCESS_KEY_ID=$(echo $CREDENTIALS | awk '{print $1}')
TEMP_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | awk '{print $2}')
TEMP_SESSION_TOKEN=$(echo $CREDENTIALS | awk '{print $3}')

# If this is an assumed role profile, assume the role using the session token
if [ -n "$SOURCE_PROFILE" ] && [ -n "$ROLE_ARN" ]; then
    echo "Now assuming role: $ROLE_ARN"

    # Generate a session name
    SESSION_NAME="get-session-token-$(date +%s)"

    # Assume the role using the temporary credentials
    ASSUME_ROLE_CREDENTIALS=$(AWS_ACCESS_KEY_ID="$TEMP_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$TEMP_SECRET_ACCESS_KEY" \
        AWS_SESSION_TOKEN="$TEMP_SESSION_TOKEN" \
        aws sts assume-role \
        --role-arn="$ROLE_ARN" \
        --role-session-name="$SESSION_NAME" \
        --output text \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]')

    if [ $? -ne 0 ]; then
        echo "Error: Failed to assume role. Check your role ARN and permissions."
        exit 1
    fi

    # Parse and export assumed role credentials
    AWS_ACCESS_KEY_ID=$(echo $ASSUME_ROLE_CREDENTIALS | awk '{print $1}')
    AWS_SECRET_ACCESS_KEY=$(echo $ASSUME_ROLE_CREDENTIALS | awk '{print $2}')
    AWS_SESSION_TOKEN=$(echo $ASSUME_ROLE_CREDENTIALS | awk '{print $3}')

    echo "Successfully assumed role!"
else
    # Use the session token credentials directly
    AWS_ACCESS_KEY_ID="$TEMP_ACCESS_KEY_ID"
    AWS_SECRET_ACCESS_KEY="$TEMP_SECRET_ACCESS_KEY"
    AWS_SESSION_TOKEN="$TEMP_SESSION_TOKEN"
fi

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_SESSION_TOKEN

echo "✅ Temporary credentials set successfully!"
echo "AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:10}..."
echo "Session expires in 1 hour."
echo ""
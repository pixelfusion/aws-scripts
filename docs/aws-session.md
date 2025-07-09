# AWS Session

A command-line tool for obtaining temporary AWS credentials with optional MFA support. This script simplifies the process of getting session tokens for both regular IAM users and assumed roles.

## Installation

The script is available as a command-line tool when the package is installed:

```bash
npm install @pixelfusion/aws-scripts
```

## Usage

### Basic Usage

```bash
# Using npx (recommended)
npx aws-session [profile] [mfa-serial-number]

# If installed globally
aws-session [profile] [mfa-serial-number]
```

### Examples

```bash
# Use default profile (AWS_PROFILE environment variable)
npx aws-session

# Use specific profile
npx aws-session my-profile

# Use specific profile with MFA serial ARN
npx aws-session my-profile arn:aws:iam::123456789012:mfa/my-user

# For assumed role profiles, the script automatically detects the source profile
npx aws-session my-assumed-role-profile
```

**Note:** The MFA_SERIAL argument should be the **serial ARN** (like `arn:aws:iam::123456789012:mfa/my-user`), not the token value from your MFA generator (like `123456`).

## Features

### Automatic MFA Detection

The script can automatically detect MFA serial numbers from your AWS profile configuration:

```bash
# In your ~/.aws/config
[profile my-profile]
mfa_serial = arn:aws:iam::123456789012:mfa/my-user
```

**MFA Serial vs MFA Token:**
- **MFA Serial**: The ARN of your MFA device (e.g., `arn:aws:iam::123456789012:mfa/my-user`)
- **MFA Token**: The 6-digit code from your MFA generator (e.g., `123456`)

The script uses the MFA serial to identify which device to authenticate with, then prompts you for the current MFA token.

### Assumed Role Support

For profiles that use assumed roles, the script will:

1. First get a session token from the source profile
2. Then assume the role using those temporary credentials
3. Export the final assumed role credentials

```bash
# In your ~/.aws/config
[profile my-assumed-role]
source_profile = my-source-profile
role_arn = arn:aws:iam::123456789012:role/MyRole
```

### Environment Variables

The script exports the following environment variables:

- `AWS_ACCESS_KEY_ID` - Temporary access key
- `AWS_SECRET_ACCESS_KEY` - Temporary secret key
- `AWS_SESSION_TOKEN` - Session token

## Configuration

### AWS Profiles

The script works with standard AWS profiles configured in `~/.aws/config` or `~/.aws/credentials`.

#### Regular IAM User Profile

```ini
[profile my-user]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
mfa_serial = arn:aws:iam::123456789012:mfa/my-user
```

#### Assumed Role Profile

```ini
[profile my-role]
source_profile = my-user
role_arn = arn:aws:iam::123456789012:role/MyRole
mfa_serial = arn:aws:iam::123456789012:mfa/my-user
```

### Environment Variables

- `AWS_PROFILE` - Default profile to use if none specified
- `AWS_ACCESS_KEY_ID` - Access key (for direct credentials)
- `AWS_SECRET_ACCESS_KEY` - Secret key (for direct credentials)

## Error Handling

The script handles various error conditions:

- **No profile specified**: Prompts to set AWS_PROFILE or pass as argument
- **Temporary credentials detected**: Warns that GetSessionToken requires long-term credentials
- **MFA token required**: Prompts for MFA token input
- **Invalid credentials**: Shows clear error messages for authentication failures
- **Role assumption failure**: Provides specific error messages for role issues

## Security

- Session tokens expire after 1 hour (3600 seconds)
- MFA tokens are prompted securely via stdin
- No credentials are logged or stored
- Works with AWS SSO and other credential providers

## Troubleshooting

### Common Issues

1. **"You are using temporary credentials"**
   - Use a profile that points directly to an IAM user, not an assumed role
   - The source profile must have long-term credentials

2. **"No MFA serial detected"**
   - Add `mfa_serial` to your AWS profile configuration
   - Or pass the MFA serial as the second argument

3. **"Failed to get session token"**
   - Check your AWS credentials are valid
   - Ensure you have the `sts:GetSessionToken` permission
   - Verify MFA token is correct (if using MFA)

### Debug Mode

To see more detailed output, you can modify the script to add debug logging or run with bash debug mode:

```bash
bash -x aws-session.sh [profile] [mfa-serial]
```

## Version

Current version: 1.0.1

## Authors

- Damian Mooyman
- Andrew Watkins

## License

ISC License
import {
  CognitoIdentityProviderClient,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

interface RegisterMfaEvent {
  body: string;
}

interface RegisterMfaResponse {
  statusCode: number;
  body: string;
}

export const handler = async (event: RegisterMfaEvent): Promise<RegisterMfaResponse> => {
  try {
    const { session, mfaCode }: { session: string; mfaCode: string } = JSON.parse(event.body);

    if (!session || !mfaCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Session and MFA code are required.' }),
      };
    }

    // Use VerifySoftwareTokenCommand for first-time verification
    const verifyCommand = new VerifySoftwareTokenCommand({
      Session: session,
      UserCode: mfaCode, // TOTP entered by the user
    });

    const response = await cognitoClient.send(verifyCommand);

    // Check response status
    if (response.Status === 'SUCCESS') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'MFA setup verified successfully. Please log in again.',
        }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid MFA code. Please try again.',
        }),
      };
    }
  } catch (error: any) {
    console.error('Error verifying MFA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to verify MFA.',
        error: error.message,
      }),
    };
  }
};

import {
  CognitoIdentityProviderClient,
  AssociateSoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

interface MfaSetupEvent {
  body: string;
}

interface MfaSetupResponse {
  statusCode: number;
  body: string;
}

export const handler = async (event: MfaSetupEvent): Promise<MfaSetupResponse> => {
  try {
    const { session }: { session: string } = JSON.parse(event.body);

    if (!session) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Session is required for MFA setup.' }),
      };
    }

    const command = new AssociateSoftwareTokenCommand({ Session: session });
    const response = await cognitoClient.send(command);

    if (response.SecretCode) {
      const otpauthUrl = `otpauth://totp/AWSCognito:${session}?secret=${response.SecretCode}&issuer=Cognito`;
      return {
        statusCode: 200,
        body: JSON.stringify({ secret: response.SecretCode, otpauthUrl }),
      };
    } else {
      throw new Error('Failed to associate software token.');
    }
  } catch (error: any) {
    console.error('Error setting up MFA:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to set up MFA.', error: error.message }),
    };
  }
};

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AssociateSoftwareTokenCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { Resource } from 'sst';
import * as QRCode from 'qrcode';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

interface AuthEvent {
  body: string;
}

interface AuthResponse {
  statusCode: number;
  body: string;
}

export const handler = async (event: AuthEvent): Promise<AuthResponse> => {
  try {
    const { email, password }: { email: string; password: string } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email and password are required.' }),
      };
    }

    const cognitoClientId = Resource.AuthClient.id;

    // Step 1: Initiate Auth
    const authCommand = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
      ClientId: cognitoClientId,
    });

    const authResponse = await cognitoClient.send(authCommand);
    console.log(authResponse);

    // Handle SOFTWARE_TOKEN_MFA challenge
    if (authResponse.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'SOFTWARE_TOKEN_MFA required',
          session: authResponse.Session,
        }),
      };
    }

    // Handle MFA Setup
    if (authResponse.ChallengeName === 'MFA_SETUP') {
      const session = authResponse.Session;

      if (!session) {
        throw new Error('Session is required for MFA setup.');
      }

      const associateCommand = new AssociateSoftwareTokenCommand({ Session: session });
      const associateResponse = await cognitoClient.send(associateCommand);

      if (!associateResponse.SecretCode) {
        throw new Error('Failed to associate software token.');
      }

      const otpauthUrl = `otpauth://totp/AWSCognito:${email}?secret=${associateResponse.SecretCode}&issuer=Cognito`;
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'MFA required',
          session: associateResponse.Session,
          qrCodeUrl,
          otpauthUrl,
          username: email,
        }),
      };
    }

    // If login succeeds
    if (authResponse.AuthenticationResult?.IdToken) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          idToken: authResponse.AuthenticationResult.IdToken,
        }),
      };
    }

    throw new Error('Unexpected authentication response.');
  } catch (error: any) {
    console.error('Error in auth handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Authentication failed.',
        error: error.message,
      }),
    };
  }
}

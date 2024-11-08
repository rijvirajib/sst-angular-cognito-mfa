import {
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Resource } from 'sst';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  try {
    const { session, mfaCode, username } = JSON.parse(event.body);

    if (!session || !mfaCode || !username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Session, MFA code, and username are required.' }),
      };
    }

    // Verify MFA Code
    const command = new RespondToAuthChallengeCommand({
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      ClientId: Resource.AuthClient.id,
      ChallengeResponses: {
        USERNAME: username,
        SOFTWARE_TOKEN_MFA_CODE: mfaCode,
      },
      Session: session, // Use session from login
    });

    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult?.IdToken) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          idToken: response.AuthenticationResult.IdToken,
          accessToken: response.AuthenticationResult.AccessToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
          expiresIn: response.AuthenticationResult.ExpiresIn,
        }),
      };
    } else {
      throw new Error('Invalid authentication result.');
    }
  } catch (error: any) {
    console.error('Error verifying MFA code:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Failed to verify MFA code.',
        error: error.message,
      }),
    };
  }
};

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { Resource } from 'sst';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  try {
    const { refreshToken } = JSON.parse(event.body);

    if (!refreshToken) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Refresh token is required.' }) };
    }

    const cognitoClientId = Resource.AuthClient.id;

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
      ClientId: cognitoClientId,
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        idToken: response.AuthenticationResult?.IdToken,
        accessToken: response.AuthenticationResult?.AccessToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn,
      }),
    };
  } catch (error: any) {
    console.error('Token refresh failed:', error);
    return { statusCode: 401, body: JSON.stringify({ message: 'Refresh token failed.', error: error.message }) };
  }
};

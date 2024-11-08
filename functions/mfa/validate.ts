import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Token is required.' }) };
    }

    const command = new GetUserCommand({ AccessToken: token });
    const userResponse = await cognitoClient.send(command);

    // Check if UserAttributes exists and handle it safely
    const attributes = userResponse.UserAttributes?.reduce((acc, attr: any) => {
      acc[attr.Name] = attr.Value;
      return acc;
    }, {} as Record<string, string>);

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        user: {
          username: userResponse.Username,
          attributes: attributes || {}, // Return an empty object if UserAttributes is undefined
        },
      }),
    };
  } catch (error: any) {
    console.error('Token validation failed:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ valid: false, error: error.message }),
    };
  }
};

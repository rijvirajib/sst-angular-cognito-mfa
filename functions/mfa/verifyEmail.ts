import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Resource } from 'sst';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  try {
    const { email, confirmationCode } = JSON.parse(event.body);

    if (!email || !confirmationCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email and confirmation code are required.' }),
      };
    }

    const cognitoClientId = Resource.AuthClient.id;

    const command = new ConfirmSignUpCommand({
      ClientId: cognitoClientId,
      Username: email,
      ConfirmationCode: confirmationCode,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email verification successful.' }),
    };
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Failed to verify email.',
        error: error.message,
      }),
    };
  }
};

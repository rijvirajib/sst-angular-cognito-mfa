import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Resource } from 'sst';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  try {
    const { email, password }: { email: string; password: string } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email and password are required.' }),
      };
    }

    const cognitoClientId = Resource.AuthClient.id;
    const userPoolId = Resource.AuthUserPool.id; // Assuming `AuthUserPool` is the name of your SST Cognito User Pool resource.

    // Sign up the user
    const signUpCommand = new SignUpCommand({
      ClientId: cognitoClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
      ],
    });

    const signUpResponse = await cognitoClient.send(signUpCommand);

    // Automatically confirm the user
    // const confirmCommand = new AdminConfirmSignUpCommand({
    //   UserPoolId: userPoolId,
    //   Username: email,
    // });

    // await cognitoClient.send(confirmCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User registered and confirmed successfully.',
        userSub: signUpResponse.UserSub,
      }),
    };
  } catch (error: any) {
    console.error('Error in signup handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to register and confirm user.', error: error.message }),
    };
  }
};

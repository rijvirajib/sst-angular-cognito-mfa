/// <reference path='./.sst/platform/config.d.ts' />
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export default $config({
  app(input) {
    return {
      name: 'starter',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          // profile: 'starter', // AWS CLI profile to use
        },
      },
    };
  },
  async run() {
    // Fetch the AWS account ID dynamically
    const stsClient = new STSClient({});
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    const accountId = identity.Account;

    // Fetch the region dynamically
    const region = aws.getRegionOutput().name;

    // Cognito User Pool
    const userPool = new sst.aws.CognitoUserPool('AuthUserPool', {
      usernames: ['email'],
      mfa: 'on', // Enable MFA
      softwareToken: true, // Use software-based MFA
    });

    // Cognito App Client
    const authClient = userPool.addClient('AuthClient', {
      transform: {
        client: {
          explicitAuthFlows: ['USER_PASSWORD_AUTH'],
          callbackUrls: ['http://localhost:4200/auth'],
          logoutUrls: ['http://localhost:4200/logout'],
        },
      },
    });

    // Cognito Identity Pool
    const identityPool = new sst.aws.CognitoIdentityPool('MyIdentityPool', {
      userPools: [
        {
          userPool: userPool.id,
          client: authClient.id,
        },
      ],
    });

    // API Gateway
    const api = new sst.aws.ApiGatewayV2('StarterAuthAPI');

    api.route('POST /mfa/signup', {
      handler: 'functions/mfa/signup.handler',
      link: [authClient, userPool],
    });

    api.route('POST /mfa/email-verification', {
      handler: 'functions/mfa/verifyEmail.handler',
      link: [authClient],
    });    

    api.route('POST /mfa/auth', {
      handler: 'functions/mfa/auth.handler',
      link: [authClient],
    });

    api.route('POST /mfa/setup', {
      handler: 'functions/mfa/setup.handler',
      link: [authClient],
    });

    api.route('POST /mfa/register', {
      handler: 'functions/mfa/register.handler',
      link: [authClient],
    });

    api.route('POST /mfa/verify', {
      handler: 'functions/mfa/verify.handler',
      link: [authClient],
    });

    api.route('POST /mfa/validate', {
      handler: 'functions/mfa/validate.handler',
      link: [authClient],
    });

    api.route('POST /mfa/refresh', {
      handler: 'functions/mfa/refresh.handler',
      link: [authClient],
    });

    // JWT Authorizer for API Gateway
    const jwtAuthorizer = api.addAuthorizer({
      name: 'JWTAuthorizer',
      jwt: {
        issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
        audiences: [authClient.id],
      },
    });

    // API Route
    api.route('GET /', 'route.handler', {
      auth: {
        jwt: {
          authorizer: jwtAuthorizer.id,
        },
      },
    });

    // Static Site for the frontend
    new sst.aws.StaticSite('StarterFrontend', {
      dev: {
        command: 'npm run start', // Dev command for local development
      },
      build: {
        output: 'dist/browser', // Build output folder
        command: 'ng build --output-path dist', // Build command
      },
      environment: {
        NG_APP_API_URL: api.url,
        NG_APP_COGNITO_USERPOOL_ID: userPool.id,
        NG_APP_COGNITO_CLIENT_ID: authClient.id,
        NG_APP_AWS_REGION: region,
      },
    });

    return {
      UserPool: userPool.id,
      AuthClient: authClient.id,
      IdentityPool: identityPool.id,
    };
  },
});

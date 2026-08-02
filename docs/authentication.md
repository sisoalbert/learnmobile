# Convex Auth Setup and Production Runbook

This project uses Convex Auth with the password provider. Authentication must be configured independently for every Convex deployment because development and production do not share code, data, or environment variables.

## 1. Configure the development deployment

Link the local project and start the development backend:

```bash
npx convex dev
```

This writes the development deployment association and client URL to the local environment files. Keep the generated `CONVEX_DEPLOYMENT` value available to Convex CLI commands.

Initialize Convex Auth for development:

```bash
npx @convex-dev/auth
```

The command generates the development `JWT_PRIVATE_KEY` and `JWKS` variables and checks the required auth files.

## 2. Configure the password provider

`convex/schema.ts` must include the auth tables:

```ts
import { authTables } from '@convex-dev/auth/server';
import { defineSchema } from 'convex/server';

export default defineSchema({
  ...authTables,
});
```

`convex/auth.ts` must include the password provider:

```ts
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

`convex/auth.config.ts` must expose the Convex deployment as the token issuer:

```ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
```

`convex/http.ts` must register the auth HTTP routes:

```ts
import { httpRouter } from 'convex/server';

import { auth } from './auth';

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
```

## 3. Test authentication in development

The mobile app connects to Convex through the public deployment URL:

```env
EXPO_PUBLIC_CONVEX_URL=https://YOUR_DEV_DEPLOYMENT.convex.cloud
```

Test all of the following before deploying:

1. Create a new account.
2. Restart the app and confirm the session is restored.
3. Sign out.
4. Sign back in.
5. Check `npx convex logs` for backend failures.

`EXPO_PUBLIC_CONVEX_DEPLOYMENT` may be used as a display label, but it does not control which backend the app uses. `EXPO_PUBLIC_CONVEX_URL` controls the connection.

## 4. Configure production authentication

Before sending production traffic to the backend, generate production-specific signing keys:

```bash
npx @convex-dev/auth --prod
```

If the CLI reports that `CONVEX_DEPLOYMENT` is not set, provide the project association for this command without changing local environment files:

```bash
CONVEX_DEPLOYMENT=prod:laudable-labrador-921 \
  npx @convex-dev/auth --prod
```

Verify the production variable names without printing their secret values:

```bash
CONVEX_DEPLOYMENT=prod:laudable-labrador-921 \
  npx convex env list --prod --names-only
```

The output must include:

```text
JWKS
JWT_PRIVATE_KEY
```

Never put either value in an `EXPO_PUBLIC_` variable or commit it to an environment file.

## 5. Deploy the production backend

Deploy and require a successful type check:

```bash
CONVEX_DEPLOYMENT=prod:laudable-labrador-921 \
  npx convex deploy --typecheck enable
```

The deployment must finish with schema validation and a successful function push to:

```text
https://laudable-labrador-921.convex.cloud
```

## 6. Configure the production app

Configure the EAS production environment with:

```env
EXPO_PUBLIC_CONVEX_URL=https://laudable-labrador-921.convex.cloud
```

Prefer EAS environment variables for remote builds. Gitignored `.env.production` files are not uploaded to EAS Build. Backend Convex variables are configured through the Convex dashboard or `npx convex env`; they are not read from the Expo `.env.production` file.

## 7. Production verification

After deployment:

1. Create an account with a fresh email address.
2. Confirm the app navigates into the authenticated experience.
3. Sign out and sign back in.
4. Check production logs with `npx convex logs --prod`.
5. Confirm handled client failures appear in Sentry without passwords or tokens.

## Troubleshooting

### `Missing environment variable JWT_PRIVATE_KEY`

The account can be written before session-token generation fails. Configure `JWT_PRIVATE_KEY` and `JWKS` on production, then use **Sign in** with the same credentials instead of attempting to create the account again.

### `No CONVEX_DEPLOYMENT set`

The Auth CLI has no local project association. Run `npx convex dev` to configure development normally, or use the one-command `CONVEX_DEPLOYMENT=prod:...` selector shown above when configuring production.

### Production app connects to development

Check the `EXPO_PUBLIC_CONVEX_URL` embedded into the EAS production build. Deployment-name badges do not select the backend.

## Release checklist

```text
Test auth in development
→ configure production JWT_PRIVATE_KEY and JWKS
→ deploy the Convex backend
→ configure the production EXPO_PUBLIC_CONVEX_URL
→ build or update the app
→ smoke-test sign-up, sign-in, session restoration, and sign-out
```

## References

- [Convex Auth](https://docs.convex.dev/auth/convex-auth)
- [Convex project configuration](https://docs.convex.dev/production/project-configuration)
- [Convex environment variables](https://docs.convex.dev/production/environment-variables)
- [Convex production deployment](https://docs.convex.dev/cli/reference/deploy)
- [Expo EAS environment variables](https://docs.expo.dev/eas/environment-variables/)

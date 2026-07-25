# Deploy Expo Web Apps to Cloudflare Workers

This guide explains how to deploy an Expo Router web application to Cloudflare Workers using Static Assets. It is written so the setup can be reused in other Expo projects.

The current Learn Expo deployment is:

- Worker name: `learnexpo`
- Production URL: <https://learnexpo.questerstudios0.workers.dev>
- Build output: `dist`
- Cloudflare configuration: `wrangler.jsonc`

## 1. Choose the Expo Web Output

Expo Router supports multiple web output modes. Choose the mode before configuring Cloudflare routing.

### Single-page application

Use `single` when navigation is handled entirely by Expo Router in the browser. Expo generates one `dist/index.html`, so Cloudflare must return that file for application paths that do not match a static asset.

```json
{
  "expo": {
    "web": {
      "output": "single"
    }
  }
}
```

Use this Cloudflare setting with `single`:

```jsonc
"not_found_handling": "single-page-application"
```

### Statically rendered routes

Use `static` when Expo should generate an HTML file for each known route. This supports route-specific HTML and metadata.

```json
{
  "expo": {
    "web": {
      "output": "static"
    }
  }
}
```

Do not add a catch-all SPA rewrite for static output. Cloudflare should serve Expo's generated route files directly. If the build includes a `404.html`, `not_found_handling: "404-page"` can be used.

### Server output

`web.output: "server"` is not a static-assets-only deployment. It requires a Cloudflare-compatible server adapter and Worker entry point. Do not use the assets-only configuration in this guide for Expo API routes or server rendering.

## 2. Install and Authenticate Wrangler

Install Wrangler locally so local development and remote builds use a pinned version:

```bash
npm install --save-dev wrangler
```

Authenticate the Cloudflare CLI:

```bash
npx wrangler login
npx wrangler whoami
```

For an existing Expo application, do not run `wrangler init <new-directory>` unless a separate Worker project is intentional. That command scaffolds a new Worker application instead of configuring the existing Expo project. Create `wrangler.jsonc` in the Expo project root, or use `npx wrangler setup` with a current Wrangler release.

## 3. Add Build and Deployment Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "build:web": "expo export -p web",
    "dev:web": "expo start --web",
    "deploy:web": "npm run build:web && wrangler deploy"
  }
}
```

Their roles are:

| Script | Purpose |
| --- | --- |
| `dev:web` | Runs Expo's development server with hot reload. |
| `build:web` | Exports the production application into `dist`. |
| `deploy:web` | Rebuilds and publishes the new assets to Cloudflare. |

To preview the production assets using Cloudflare locally:

```bash
npm run build:web
npx wrangler dev
```

Expo's development server remains the preferred option while actively editing the application. Wrangler preview is useful for checking production asset routing.

## 4. Add Wrangler Configuration

Create `wrangler.jsonc` in the same directory as `package.json`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "replace-with-worker-name",
  "compatibility_date": "YYYY-MM-DD",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "html_handling": "drop-trailing-slash"
  }
}
```

Replace:

- `name` with a unique Cloudflare Worker name.
- `compatibility_date` with the setup date or the date already used by the project.
- `not_found_handling` based on the Expo output choice described above.

The assets-only configuration intentionally has no `main` or asset binding. Those are only needed when a custom Worker script must execute alongside the static application.

### Custom-framework configuration mapping

Generic hosting settings map to Expo and Wrangler as follows:

| Generic setting | Expo/Cloudflare implementation |
| --- | --- |
| `buildCommand` | `expo export -p web` or `npm run build:web` |
| `outputDirectory` | `dist` |
| `devCommand` | `expo start --web` |
| `framework: null` | No Cloudflare framework preset |
| `cleanUrls: true` | `html_handling: "drop-trailing-slash"` |
| Rewrite `/:path*` to `/` | `not_found_handling: "single-page-application"` |

Build commands and development commands are package or Cloudflare build settings. They are not replacements for `assets.directory` in Wrangler.

## 5. Build and Validate Locally

Run the application checks and production export:

```bash
npx tsc --noEmit
npm run lint
npm run build:web
```

Confirm that `dist/index.html` exists:

```bash
test -f dist/index.html
```

Validate the Cloudflare bundle without publishing it:

```bash
npx wrangler deploy --dry-run
```

The dry run should report the assets found in `dist` and finish without missing bindings or configuration errors.

## 6. Deploy

Build and deploy in one command:

```bash
npm run deploy:web
```

Wrangler creates the Worker on the first deployment and updates it on later deployments. The output includes the `workers.dev` URL and deployed version identifier.

To deploy after a build has already been verified:

```bash
npx wrangler deploy
```

## 7. Verify Production

Verify the root document and at least one nested route:

```bash
curl -I https://WORKER.SUBDOMAIN.workers.dev/
curl -I https://WORKER.SUBDOMAIN.workers.dev/profile/settings
```

Both should return HTTP `200` for an SPA. Also open the nested URL directly in a browser and refresh it. A route that works only after clicking from `/` usually means the SPA fallback is missing.

Verify that JavaScript, fonts, images, and `favicon.ico` load successfully. Hashed files under `/_expo/static/` and `/assets/` should be served as files rather than rewritten to `index.html`.

## 8. Configure Git-Based Deployments

When connecting a Git repository through Cloudflare Workers Builds, use:

- Build command: `npm run build:web`
- Deploy command: `npx wrangler deploy`
- Non-production deploy command: `npx wrangler versions upload`
- Root directory: the directory containing the Expo app's `package.json`

For a monorepo, the root directory must point to the Expo package rather than the repository root. Cloudflare Workers Builds uses the Wrangler version declared in `package.json`.

Cloudflare build commands must be configured in the Worker dashboard or Builds API. Workers Builds does not use Wrangler's custom-build section as its dashboard build command.

## 9. Environment Variables and Secrets

An assets-only Expo web build executes in the browser:

- Variables prefixed with `EXPO_PUBLIC_` are embedded into the JavaScript bundle during `expo export`.
- Never put secrets, private API keys, or server credentials in `EXPO_PUBLIC_` variables.
- Cloudflare build variables are available while exporting the app but are not automatically runtime Worker variables.
- Runtime secrets require a Worker script or backend service and should be added with `wrangler secret put`.

After changing a build-time variable, rebuild and redeploy the application.

## 10. Custom Domains

After the `workers.dev` deployment works:

1. Open the Worker in the Cloudflare dashboard.
2. Open **Settings > Domains & Routes**.
3. Add a custom domain or route.
4. Verify the root URL and a direct nested route on the custom hostname.

Keep the `workers.dev` URL available until DNS and TLS provisioning are complete.

## 11. Common Problems

### Nested routes return 404

- For `web.output: "single"`, set `not_found_handling` to `single-page-application`.
- Rebuild after changing `app.json`.
- Confirm `dist/index.html` exists.

### Static assets return HTML

- Confirm `assets.directory` points to the actual Expo output directory.
- Do not place generated assets outside `dist`.
- Check that the requested asset path exists before deployment.

### The deployment shows an old build

- Run `npm run build:web` before `wrangler deploy`.
- Prefer `npm run deploy:web`, which always rebuilds first.
- Confirm the new Wrangler version identifier after deployment.

### The CLI uses the wrong Cloudflare account

```bash
npx wrangler whoami
```

Log out and authenticate again if the active account is incorrect.

### Wrangler cannot write local logs

Wrangler writes logs outside the repository on macOS. Restricted shells may need permission to write to the Wrangler preferences directory. This does not indicate an invalid deployment configuration, but the command should be rerun in a shell with the required permission.

### Node engine warnings

Use the Node version required by the installed Expo and React Native versions. A dependency installation may finish with engine warnings while later builds fail in CI if the runtime is too old.

## 12. Changes Made in Learn Expo

The following project changes produced the current deployment:

### `app.json`

Changed Expo web output from static rendering to an SPA:

```diff
- "output": "static"
+ "output": "single"
```

### `package.json`

Added:

```json
{
  "scripts": {
    "build:web": "expo export -p web",
    "dev:web": "expo start --web",
    "deploy:web": "npm run build:web && wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.114.0"
  }
}
```

### `wrangler.jsonc`

Added the `learnexpo` Worker name, current compatibility date, `dist` assets directory, clean-URL behavior, and SPA fallback.

### `package-lock.json`

Updated automatically when Wrangler was installed.

### Generated output

`dist` is generated by `expo export` and should not be edited manually. It is excluded from version control and recreated for every production deployment.

## References

- [Expo: Publish websites](https://docs.expo.dev/guides/publishing-websites/)
- [Cloudflare: Deploy a single-page application](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Cloudflare: Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare: Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

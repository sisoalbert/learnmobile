import { httpRouter } from 'convex/server';

import { auth } from './auth';

import { confirmAccountDeletion, requestAccountDeletion } from './users';

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: '/request-account-deletion',
  method: 'POST',
  handler: requestAccountDeletion,
});

http.route({
  path: '/confirm-account-deletion',
  method: 'GET',
  handler: confirmAccountDeletion,
});

http.route({
  path: '/request-account-deletion',
  method: 'OPTIONS',
  handler: requestAccountDeletion,
});

export default http;

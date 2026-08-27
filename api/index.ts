/**
 * Vercel serverless entry.
 * Build the server first: npm run build:api
 * Then this file re-exports the Express app so /api/* is handled by it.
 */
// @ts-expect-error - built output
import app from '../server/dist/app.js'
export default app

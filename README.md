# Shopify Discount App

A Shopify app for managing complex discounts with support for multiple discount types (product, order, and shipping) in a single function.

## Overview

This app provides a comprehensive discount management system that allows merchants to:

- Create and manage automatic discounts and discount codes
- Combine multiple discount types in a single function
- Target specific product collections
- Apply percentage-based or fixed amount discounts
- Set usage limits and combination rules

## Installing the App

1. Go to your [Shopify Partners Dashboard](https://partners.shopify.com)
2. Navigate to Apps > Create App
3. Fill in the app details:
   - App name: Discount App
   - App URL: `https://discount-app-proto.onrender.com`
4. After creating the app, go to the Configuration tab
5. In the URLs section, add the following:
   - App URL: `https://discount-app-proto.onrender.com`
   - Allowed redirection URL(s):
     ```
     https://discount-app-proto.onrender.com/auth/callback
     https://discount-app-proto.onrender.com/auth/shopify/callback
     https://discount-app-proto.onrender.com/api/auth/callback
     ```
6. Save the app configuration
7. Go to the Distribution tab in your app settings
8. Select "Custom distribution"
9. Enter your store URL (e.g., `your-store.myshopify.com`)
10. Click "Install app" to add the app to your store

## Development Setup

1. [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager)
2. Node.js 18.x or later
3. [Shopify Partner account](https://partners.shopify.com/signup)
4. Development store or [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store)
5. [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) installed
6. Docker and Docker Compose (for local database)

### Setup Steps

1. Install dependencies:

```bash
# Use the correct Node.js version
nvm use

# Install dependencies
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your Shopify app credentials.

3. Start the local PostgreSQL database using Docker Compose:

```bash
docker-compose up -d
```

4. Set up the database:

```bash
npm run setup
```

5. Start the development server:

```bash
npm run dev
```

## Testing

The project uses Vitest for testing. To run tests:

```bash
npm test
```

## Project Structure

```
app/
├── components/     # React components
├── hooks/         # Custom React hooks
├── models/        # Database models
├── routes/        # Remix routes
├── types/         # TypeScript type definitions
└── utils/         # Utility functions

extensions/
└── discount-function/  # Shopify discount function
```

## Tech Stack

- [Remix](https://remix.run) - Web framework
- [Shopify App Bridge](https://shopify.dev/docs/apps/tools/app-bridge) - Admin integration
- [Polaris](https://polaris.shopify.com/) - Design system
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Prisma](https://www.prisma.io/) - Database ORM
- [Vitest](https://vitest.dev/) - Testing framework
- [React Testing Library](https://testing-library.com/) - Component testing
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Docker](https://www.docker.com/) - Containerization

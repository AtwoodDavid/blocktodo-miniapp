import './globals.css';
import { siteConfig } from '@/lib/site';
import { Providers } from './providers';

const framePayload = JSON.stringify({
  version: 'next',
  imageUrl: siteConfig.ogImageUrl,
  button: {
    title: 'Open BlockTodo',
    action: {
      type: 'launch_frame',
      name: siteConfig.name,
      url: siteConfig.url,
      splashImageUrl: siteConfig.splashImageUrl,
      splashBackgroundColor: siteConfig.splashBackgroundColor,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>BlockTodo</title>
        <meta name="description" content="Manage todo items onchain with create, toggle, delete, and live reads on Base." />
        <meta name="application-name" content="BlockTodo" />
        <meta name="generator" content="BlockTodo" />
        <meta name="keywords" content="base,mini app,todo,productivity,utility,onchain" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="robots" content="index,follow" />
        <meta name="base:app_id" content="69c344215262875b1be38c59" />
        <meta name="talentapp:project_verification" content="ef27b823daa9cce2e805511612e234c625ce3bae6db39775781407a276b17469604c4f7b43c7ce41c2b4c875fe214638a67c6f2d92d6ed09fdda83fb9f3434f6" />
        <link rel="canonical" href="https://blocktodo-miniapp.vercel.app" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="BlockTodo" />
        <meta property="og:title" content="BlockTodo | Onchain Todo Manager on Base" />
        <meta property="og:description" content="Create, complete, remove, and browse todo items from a live Base contract in a production-ready mini app." />
        <meta property="og:url" content="https://blocktodo-miniapp.vercel.app" />
        <meta property="og:image" content="https://blocktodo-miniapp.vercel.app/og.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BlockTodo | Onchain Todo Manager on Base" />
        <meta name="twitter:description" content="Create, complete, remove, and browse todo items from a live Base contract in a production-ready mini app." />
        <meta name="twitter:image" content="https://blocktodo-miniapp.vercel.app/og.svg" />
        <meta name="fc:frame" content={framePayload} />
        <meta name="fc:miniapp" content={framePayload} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

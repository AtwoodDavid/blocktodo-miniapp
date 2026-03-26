import { siteConfig } from '@/lib/site';

export async function GET() {
  return Response.json({
    accountAssociation: {
      header: '',
      payload: '',
      signature: '',
    },
    frame: {
      version: '1',
      name: siteConfig.name,
      homeUrl: siteConfig.url,
      iconUrl: siteConfig.iconUrl,
      imageUrl: siteConfig.ogImageUrl,
      buttonTitle: 'Open BlockTodo',
      splashImageUrl: siteConfig.splashImageUrl,
      splashBackgroundColor: siteConfig.splashBackgroundColor,
      webhookUrl: `${siteConfig.url}/api/webhook`,
      subtitle: siteConfig.subtitle,
      description: siteConfig.description,
      primaryCategory: siteConfig.primaryCategory,
      tags: siteConfig.tags,
      heroImageUrl: siteConfig.ogImageUrl,
      tagline: siteConfig.tagline,
      ogTitle: siteConfig.ogTitle,
      ogDescription: siteConfig.ogDescription,
      ogImageUrl: siteConfig.ogImageUrl,
      noindex: false,
    },
  });
}

export function detectSource(url: string): 'X/Twitter' | 'GitHub' | 'YouTube' | 'Reddit' | 'Medium' | 'Web' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return 'X/Twitter';
    }
    if (hostname.includes('github.com')) {
      return 'GitHub';
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'YouTube';
    }
    if (hostname.includes('reddit.com')) {
      return 'Reddit';
    }
    if (hostname.includes('medium.com')) {
      return 'Medium';
    }

    return 'Web';
  } catch {
    return 'Web';
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

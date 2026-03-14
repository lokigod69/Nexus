import type { GitHubStatsData } from '@/types';

const GITHUB_REPO_REGEX = /github\.com\/([^/]+)\/([^/\s?#]+)/;

export function isGitHubRepoUrl(url: string): boolean {
  return GITHUB_REPO_REGEX.test(url);
}

/**
 * Fetch GitHub repo stats. Returns null for non-GitHub URLs or failures.
 */
export async function fetchGitHubStats(url: string): Promise<GitHubStatsData | null> {
  const match = url.match(GITHUB_REPO_REGEX);
  if (!match) return null;

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return null;
  const data = await response.json();

  const lastPush = new Date(data.pushed_at);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  return {
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    lastCommit: data.pushed_at,
    description: data.description,
    isOutdated: lastPush < twoYearsAgo,
    openIssues: data.open_issues_count,
  };
}

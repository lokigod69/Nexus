import { CaptureScreen } from '@/components/capture/CaptureScreen';

// PWA share target (manifest share_target GET) lands here with
// ?text= / ?url= / ?title= — prefill the capture input.
export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined): string =>
    typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : '';

  // Prefer the shared URL (server detects url-vs-text from the raw paste).
  const initialText = pick(params.url) || pick(params.text) || pick(params.title);

  return <CaptureScreen initialText={initialText} />;
}

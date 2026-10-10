export const unrealPixelStreamingUrl =
  process.env.EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL || '';

export const isUnrealStreamingConfigured = Boolean(
  unrealPixelStreamingUrl &&
  /^https?:\/\//.test(unrealPixelStreamingUrl) &&
  !unrealPixelStreamingUrl.includes('YOUR_UNREAL_PIXEL_STREAMING_URL')
);

export function buildUnrealSessionUrl(params: {
  coupleId?: string | null;
  userId?: string | null;
}) {
  if (!isUnrealStreamingConfigured) {
    return '';
  }

  const url = new URL(unrealPixelStreamingUrl);

  if (params.coupleId) {
    url.searchParams.set('coupleId', params.coupleId);
  }

  if (params.userId) {
    url.searchParams.set('userId', params.userId);
  }

  url.searchParams.set('source', 'loveverse');
  return url.toString();
}

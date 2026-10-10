import { ProfileLabel } from '../types';

export const unrealPixelStreamingUrl =
  process.env.EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL || '';

export const isUnrealStreamingConfigured = Boolean(
  unrealPixelStreamingUrl &&
  /^https?:\/\//.test(unrealPixelStreamingUrl) &&
  !unrealPixelStreamingUrl.includes('YOUR_UNREAL_PIXEL_STREAMING_URL')
);

export interface UnrealSessionParams {
  coupleId?: string | null;
  publicCoupleId?: string | null;
  userId?: string | null;
  userLoveverseId?: string | null;
  partnerLoveverseId?: string | null;
  role?: ProfileLabel | null;
  mapName?: string;
}

/**
 * Validates that the session parameters meet LoveVerse authorization standards:
 * Requires an authenticated user and an active couple ID.
 */
export function validateUnrealSessionAuth(params: UnrealSessionParams): {
  authorized: boolean;
  reason?: string;
} {
  if (!params.userId) {
    return { authorized: false, reason: 'Missing authenticated user ID' };
  }
  if (!params.coupleId && !params.publicCoupleId) {
    return { authorized: false, reason: 'Missing couple pairing authorization' };
  }
  return { authorized: true };
}

/**
 * Builds the Unreal Engine 5 Pixel Streaming URL with authorized session query parameters.
 */
export function buildUnrealSessionUrl(params: UnrealSessionParams): string {
  const auth = validateUnrealSessionAuth(params);
  if (!auth.authorized) {
    return '';
  }

  const baseUrl = isUnrealStreamingConfigured
    ? unrealPixelStreamingUrl
    : 'https://stream.loveverse.app/ue5';

  try {
    const url = new URL(baseUrl);

    if (params.coupleId) {
      url.searchParams.set('coupleId', params.coupleId);
    }
    if (params.publicCoupleId) {
      url.searchParams.set('publicCoupleId', params.publicCoupleId);
    }
    if (params.userId) {
      url.searchParams.set('userId', params.userId);
    }
    if (params.userLoveverseId) {
      url.searchParams.set('userLoveverseId', params.userLoveverseId);
    }
    if (params.partnerLoveverseId) {
      url.searchParams.set('partnerLoveverseId', params.partnerLoveverseId);
    }
    if (params.role) {
      url.searchParams.set('role', params.role);
    }
    if (params.mapName) {
      url.searchParams.set('map', params.mapName);
    }

    url.searchParams.set('source', 'loveverse');
    url.searchParams.set('v', '5.4');

    return url.toString();
  } catch (e) {
    console.error('Failed to build Unreal session URL:', e);
    return '';
  }
}

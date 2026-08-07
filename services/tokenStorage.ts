import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'hents_hurga_access_token';
const REFRESH_TOKEN_KEY = 'hents_hurga_refresh_token';

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getAccessToken() {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

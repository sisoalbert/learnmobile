import * as SecureStore from 'expo-secure-store';

const secureStoreKey = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '.');

export const learnerTokenStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(secureStoreKey(name)),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(secureStoreKey(name), value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(secureStoreKey(name)),
};

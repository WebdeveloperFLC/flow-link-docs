import type { TelephonyProvider, TelephonyProviderName } from "./types.ts";
import { telecmi } from "./telecmi.ts";

const REGISTRY: Record<TelephonyProviderName, TelephonyProvider> = {
  telecmi,
};

export function getProvider(name?: string): TelephonyProvider {
  const key = (name ?? "telecmi") as TelephonyProviderName;
  return REGISTRY[key] ?? telecmi;
}
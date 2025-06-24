import { AnyAsset } from "./types"

/**
 * Check if two assets are equal
 *
 * @param asset1 - First asset to compare
 * @param asset2 - Second asset to compare
 * @returns true if assets are the same type
 */
export function assetsEqual(asset1: AnyAsset, asset2: AnyAsset): boolean {
  // Check if both assets have the same properties
  if ('code' in asset1 && 'code' in asset2) {
    return asset1.code === asset2.code
  }
  
  // For basic assets, compare by name
  return asset1.name === asset2.name
}
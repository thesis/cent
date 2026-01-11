/**
 * Pluralize fractional unit names
 *
 * @param unitName - The singular unit name
 * @returns The pluralized unit name
 */
export function pluralizeFractionalUnit(unitName: string): string {
  // Handle special cases for irregular plurals
  const irregularPlurals: Record<string, string> = {
    penny: "pence",
    kopek: "kopeks",
    grosz: "groszy",
    fils: "fils", // Already plural
    sen: "sen", // Already plural
    pul: "puls",
    qəpik: "qəpiks",
    tyiyn: "tyiyns",
    möngö: "möngös",
  }

  if (irregularPlurals[unitName]) {
    return irregularPlurals[unitName]
  }

  // Handle regular pluralization rules
  if (unitName.endsWith("y")) {
    return `${unitName.slice(0, -1)}ies`
  }
  if (unitName.endsWith("z")) {
    return `${unitName}zes`
  }
  if (
    unitName.endsWith("s") ||
    unitName.endsWith("sh") ||
    unitName.endsWith("ch") ||
    unitName.endsWith("x")
  ) {
    return `${unitName}es`
  }
  return `${unitName}s`
}

/**
 * Find information about a fractional unit
 *
 * @param fractionalUnit - The fractional unit definition from the asset
 * @param unitName - The unit name to search for
 * @returns Unit information or null if not found
 */
export function findFractionalUnitInfo(
  fractionalUnit: string | string[] | Record<number, string | string[]>,
  unitName: string,
  assetDecimals: number,
): { decimals: number; name: string } | null {
  if (typeof fractionalUnit === "string") {
    if (fractionalUnit === unitName) {
      return { decimals: assetDecimals, name: fractionalUnit }
    }
  } else if (Array.isArray(fractionalUnit)) {
    if (fractionalUnit.includes(unitName)) {
      return { decimals: assetDecimals, name: fractionalUnit[0] }
    }
  } else {
    const entries = Object.entries(fractionalUnit)
    const foundEntry = entries.find(([, names]) => {
      const nameArray = Array.isArray(names) ? names : [names]
      return nameArray.includes(unitName)
    })

    if (foundEntry) {
      const [decimalsStr, names] = foundEntry
      const decimals = parseInt(decimalsStr, 10)
      const nameArray = Array.isArray(names) ? names : [names]
      return { decimals, name: nameArray[0] }
    }
  }

  return null
}

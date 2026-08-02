export function calcScore(amicable: number, nonAmicable: number): number {
  const total = amicable + nonAmicable;
  if (total === 0) return 90;

  if (amicable === 0) {
    if (nonAmicable === 1) return 78;
    if (nonAmicable === 2) return 72;
    return 68;
  }

  // 1+ amicable exits
  const ratio = amicable / total;
  if (ratio >= 0.7) return 90;   // mostly amicable
  if (total <= 4)   return 80;   // recovering (covers 1/3 and 1/4)
  if (ratio >= 0.4) return 80;
  return 75;
}

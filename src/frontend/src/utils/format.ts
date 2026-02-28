export function formatDuration(seconds: number): string {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBigIntDuration(duration: bigint): string {
  return formatDuration(Number(duration));
}

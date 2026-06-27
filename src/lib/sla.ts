import type { SLAStatus } from "@/types";

export const slaStatusConfig: Record<
  SLAStatus,
  {
    label: string;
    className: string;
  }
> = {
  ON_TRACK: {
    label: "On Track",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  SLA_WARNING: {
    label: "SLA Warning",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SLA_VIOLATED: {
    label: "SLA Violated",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  RESOLVED: {
    label: "Resolved",
    className: "border-green-200 bg-green-50 text-green-700",
  },
};

export const formatSLASeconds = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);
  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes}m`);
  }

  const value = parts.length > 0 ? parts.join(" ") : "<1m";
  return seconds < 0 ? `${value} overdue` : value;
};

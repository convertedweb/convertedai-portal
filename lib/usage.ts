export type ConversationUsage = {
  callDurationSecs: number | null;
  startTimeUnix: number | null;
};

export function getUsageMonthKey(unixSeconds: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "Europe/Budapest",
    year: "numeric",
  }).formatToParts(new Date(unixSeconds * 1000));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function calculateUsageCostHuf(seconds: number, minuteRateHuf: number | null) {
  if (minuteRateHuf === null) return null;
  return Math.round((seconds / 60) * minuteRateHuf * 100) / 100;
}

export function summarizeMonthlyUsage(conversations: ConversationUsage[], currentMonthKey: string) {
  const months = new Map<string, { conversationCount: number; seconds: number }>();
  let totalSeconds = 0;
  let totalConversationCount = 0;
  let undatedSeconds = 0;

  for (const conversation of conversations) {
    const seconds = conversation.callDurationSecs;
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) continue;
    totalSeconds += seconds;
    totalConversationCount += 1;

    if (conversation.startTimeUnix === null || !Number.isFinite(conversation.startTimeUnix)) {
      undatedSeconds += seconds;
      continue;
    }

    const monthKey = getUsageMonthKey(conversation.startTimeUnix);
    const month = months.get(monthKey) ?? { conversationCount: 0, seconds: 0 };
    month.conversationCount += 1;
    month.seconds += seconds;
    months.set(monthKey, month);
  }

  if (!months.has(currentMonthKey)) months.set(currentMonthKey, { conversationCount: 0, seconds: 0 });

  const monthItems = Array.from(months, ([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return {
    currentMonthSeconds: months.get(currentMonthKey)?.seconds ?? 0,
    maxMonthSeconds: Math.max(...monthItems.map((item) => item.seconds), 1),
    monthItems,
    totalConversationCount,
    totalSeconds,
    undatedSeconds,
  };
}

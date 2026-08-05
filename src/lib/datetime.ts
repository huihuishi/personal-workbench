/**
 * 时区安全的查询范围辅助。
 *
 * 日历事件统一以 UTC 时刻（Date.toISOString）存入 TIMESTAMPTZ 列，
 * 因此用 Supabase 做 gte/lte 比较时，边界也必须用 UTC 时刻，
 * 否则在 GMT+8 等时区下会出现跨日 / 跨月的 off-by-one
 * （例如凌晨 0-8 点的事件被算到前一天，月初 0-8 点的事件被漏查）。
 */

export interface UtcRange {
  gte: string;
  lte: string;
}

/** 某本地日期当天的 UTC 起止时刻（ISO），用于 start_time 的 gte/lte 过滤。 */
export function getDayUtcRange(date: Date = new Date()): UtcRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { gte: start.toISOString(), lte: end.toISOString() };
}

/**
 * 某本地月份的 UTC 起止时刻，并向前后各 padding 一天。
 * padding 用于抵消时区偏移：月初本地 0-8 点的事件在 UTC 下会落在上个月，
 * 不 padding 就会被漏查；末端同理。返回的是 [gte, lt) 半开区间。
 */
export function getMonthUtcRange(date: Date): { gte: string; lt: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  end.setDate(end.getDate() + 1);
  return { gte: start.toISOString(), lt: end.toISOString() };
}

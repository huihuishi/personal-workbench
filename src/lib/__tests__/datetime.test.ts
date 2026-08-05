import { describe, it, expect } from 'vitest';
import { getDayUtcRange, getMonthUtcRange } from '@/lib/datetime';

describe('getDayUtcRange', () => {
  // 用「本地构造」方式生成事件时间戳，与函数内部逻辑保持同一时区基准，
  // 因此断言与运行环境时区无关，但能验证 GMT+8 下的跨日 off-by-one 是否被修复。
  const day = new Date(2026, 6, 30); // 2026-07-30 本地

  it('返回当天本地 0 点与 23:59:59.999 的 UTC 边界', () => {
    const r = getDayUtcRange(day);
    const expectedGte = new Date(2026, 6, 30, 0, 0, 0, 0).toISOString();
    const expectedLte = new Date(2026, 6, 30, 23, 59, 59, 999).toISOString();
    expect(r.gte).toBe(expectedGte);
    expect(r.lte).toBe(expectedLte);
  });

  it('当天凌晨(本地 07:00)事件落在范围内', () => {
    const r = getDayUtcRange(day);
    const earlyMorning = new Date(2026, 6, 30, 7, 0).toISOString();
    expect(earlyMorning >= r.gte && earlyMorning <= r.lte).toBe(true);
  });

  it('当天深夜(本地 23:30)事件落在范围内', () => {
    const r = getDayUtcRange(day);
    const lateNight = new Date(2026, 6, 30, 23, 30).toISOString();
    expect(lateNight >= r.gte && lateNight <= r.lte).toBe(true);
  });

  it('前一天深夜(本地 23:30)事件不落入当天范围 —— 修复 GMT+8 跨日漂移', () => {
    const r = getDayUtcRange(day);
    const prevDayLate = new Date(2026, 6, 29, 23, 30).toISOString();
    expect(prevDayLate >= r.gte && prevDayLate <= r.lte).toBe(false);
  });

  it('默认使用当前时间', () => {
    const r = getDayUtcRange();
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    expect(new Date(r.gte).getTime()).toBe(start.getTime());
  });
});

describe('getMonthUtcRange', () => {
  it('返回当月前后各 padding 一天的半开区间 [gte, lt)', () => {
    const r = getMonthUtcRange(new Date(2026, 6, 15)); // 2026-07
    const expectedGte = new Date(2026, 6, 0, 0, 0, 0, 0).toISOString(); // 6-30
    const expectedLt = new Date(2026, 7, 2, 0, 0, 0, 0).toISOString(); // 8-2
    expect(r.gte).toBe(expectedGte);
    expect(r.lt).toBe(expectedLt);
  });

  it('月初本地 06:00 事件(UTC 落在上月)被包含在当月查询窗口内', () => {
    const r = getMonthUtcRange(new Date(2026, 6, 15)); // 2026-07
    const july1Early = new Date(2026, 6, 1, 6, 0).toISOString();
    expect(july1Early >= r.gte && july1Early < r.lt).toBe(true);
  });

  it('月末本地事件落在窗口内', () => {
    const r = getMonthUtcRange(new Date(2026, 6, 15)); // 2026-07
    const july31Late = new Date(2026, 6, 31, 23, 0).toISOString();
    expect(july31Late >= r.gte && july31Late < r.lt).toBe(true);
  });
});

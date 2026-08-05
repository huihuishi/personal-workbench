import { describe, it, expect } from 'vitest';
import { parseCsvExpenses, sumCsvAmount } from '@/lib/finance/csv';

const FALLBACK = '2026-07-30';

describe('parseCsvExpenses', () => {
  it('解析标准四列行', () => {
    const r = parseCsvExpenses('50.00,2026-07-30,餐饮,午餐\n100,2026-07-29,交通,打车', FALLBACK);
    expect(r).toEqual([
      { amount: 50, date: '2026-07-30', category: '餐饮', description: '午餐' },
      { amount: 100, date: '2026-07-29', category: '交通', description: '打车' },
    ]);
  });

  it('去掉字段两端的引号', () => {
    const r = parseCsvExpenses('"88.8","2026-07-30","餐饮","晚饭"', FALLBACK);
    expect(r[0]).toEqual({ amount: 88.8, date: '2026-07-30', category: '餐饮', description: '晚饭' });
  });

  it('缺日期时使用 fallback', () => {
    const r = parseCsvExpenses('60,,餐饮,', FALLBACK);
    expect(r[0].date).toBe(FALLBACK);
  });

  it('金额非数字的行被忽略', () => {
    const r = parseCsvExpenses('abc,2026-07-30,餐饮,午餐\n100,2026-07-29', FALLBACK);
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(100);
  });

  it('列数 < 2 的单行数字被忽略（不再误扣余额）', () => {
    // 旧实现里 `100` 这种只有金额、缺日期列的行会被余额扣减逻辑计入，
    // 却不会入库，造成账目不平。这里应当被安全忽略。
    const r = parseCsvExpenses('100\n50,2026-07-30,餐饮,午餐', FALLBACK);
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(50);
  });

  it('空文本返回空数组', () => {
    expect(parseCsvExpenses('', FALLBACK)).toEqual([]);
    expect(parseCsvExpenses('   \n  ', FALLBACK)).toEqual([]);
  });
});

describe('sumCsvAmount', () => {
  it('仅对将入库的金额求和，与 parseCsvExpenses 严格一致', () => {
    const csv = '50,2026-07-30,餐饮,午餐\n100\nabc,2026-07-29\n200,2026-07-28,交通';
    const sum = sumCsvAmount(csv);
    // 仅 50 与 200 入库
    expect(sum).toBe(250);
    // 余额扣减金额 === 实际入库金额之和
    const parsed = parseCsvExpenses(csv, FALLBACK);
    const manual = parsed.reduce((s, e) => s + e.amount, 0);
    expect(sum).toBe(manual);
  });
});

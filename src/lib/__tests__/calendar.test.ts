import { describe, it, expect } from 'vitest';
import {
  parseNaturalDate,
  getCalendarGrid,
  getWeekdayChinese,
  formatTime,
  formatDateTime,
  formatDateFull,
  getLunarDate,
  getLunarFestival,
  getSolarFestival,
  isToday,
} from '@/lib/calendar/utils';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

describe('parseNaturalDate - 相对日期', () => {
  it('今天', () => {
    const r = parseNaturalDate('今天');
    expect(r).not.toBeNull();
    const now = new Date();
    expect(r!.start.getFullYear()).toBe(now.getFullYear());
    expect(r!.start.getMonth()).toBe(now.getMonth());
    expect(r!.start.getDate()).toBe(now.getDate());
    expect(r!.start.getHours()).toBe(9); // 默认上午9点
  });

  it('明天为今天+1天，默认9点', () => {
    const r = parseNaturalDate('明天');
    const now = new Date();
    const tomorrow = addDays(now, 1);
    expect(r!.start.getDate()).toBe(tomorrow.getDate());
    expect(r!.start.getHours()).toBe(9);
    expect(r!.end!.getTime()).toBe(r!.start.getTime() + 3600_000);
  });

  it('后天为今天+2天', () => {
    const r = parseNaturalDate('后天');
    const now = new Date();
    expect(r!.start.getDate()).toBe(addDays(now, 2).getDate());
  });

  it('大后天为今天+3天', () => {
    const r = parseNaturalDate('大后天');
    const now = new Date();
    expect(r!.start.getDate()).toBe(addDays(now, 3).getDate());
  });
});

describe('parseNaturalDate - 下周X（必须落在下一周）', () => {
  const cases: [string, number][] = [
    ['下周一', 1],
    ['下周二', 2],
    ['下周三', 3],
    ['下周四', 4],
    ['下周五', 5],
    ['下周六', 6],
    ['下周日', 0],
  ];
  for (const [text, targetDay] of cases) {
    it(text, () => {
      const r = parseNaturalDate(text);
      expect(r).not.toBeNull();
      // 星期几正确
      expect(r!.start.getDay()).toBe(targetDay);
      // 必须严格晚于本周结束（即确属下一周，而非本周内最近的那天）
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      expect(r!.start.getTime()).toBeGreaterThan(weekEnd.getTime());
    });
  }
});

describe('parseNaturalDate - 周X（本周内）', () => {
  const cases: [string, number][] = [
    ['周一', 1],
    ['周二', 2],
    ['周三', 3],
    ['周四', 4],
    ['周五', 5],
    ['周六', 6],
    ['周日', 0],
  ];
  for (const [text, targetDay] of cases) {
    it(`星期${text}`, () => {
      const r = parseNaturalDate(`星期${text}`);
      expect(r).not.toBeNull();
      expect(r!.start.getDay()).toBe(targetDay);
      // 应落在本周内（含今天），不会跑到下一周
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      expect(r!.start.getTime()).toBeGreaterThanOrEqual(weekStart.getTime());
    });
  }
});

describe('parseNaturalDate - 时间解析', () => {
  it('明天下午3点 -> 15:00', () => {
    const r = parseNaturalDate('明天下午3点');
    expect(r!.start.getHours()).toBe(15);
    expect(r!.start.getMinutes()).toBe(0);
  });

  it('明天上午9点半 -> 09:30', () => {
    const r = parseNaturalDate('明天上午9点半');
    expect(r!.start.getHours()).toBe(9);
    expect(r!.start.getMinutes()).toBe(30);
  });

  it('晚上8点 -> 20:00', () => {
    const r = parseNaturalDate('晚上8点');
    expect(r!.start.getHours()).toBe(20);
  });

  it('中午12点 -> 12:00', () => {
    const r = parseNaturalDate('中午12点');
    expect(r!.start.getHours()).toBe(12);
  });

  it('凌晨3点 -> 03:00', () => {
    const r = parseNaturalDate('凌晨3点');
    expect(r!.start.getHours()).toBe(3);
  });

  it('下午3点30分 -> 15:30', () => {
    const r = parseNaturalDate('下午3点30分');
    expect(r!.start.getHours()).toBe(15);
    expect(r!.start.getMinutes()).toBe(30);
  });

  it('中午12点 -> 12:00（正午）', () => {
    const r = parseNaturalDate('中午12点');
    expect(r!.start.getHours()).toBe(12);
  });

  it('晚上12点 -> 00:00（午夜，而非中午）', () => {
    const r = parseNaturalDate('晚上12点');
    expect(r!.start.getHours()).toBe(0);
  });

  it('凌晨12点 -> 00:00（午夜）', () => {
    const r = parseNaturalDate('凌晨12点');
    expect(r!.start.getHours()).toBe(0);
  });
});

describe('parseNaturalDate - 指定月日', () => {
  it('12月25日下午3点', () => {
    const r = parseNaturalDate('12月25日下午3点');
    expect(r).not.toBeNull();
    expect(r!.start.getMonth()).toBe(11); // 12月
    expect(r!.start.getDate()).toBe(25);
    expect(r!.start.getHours()).toBe(15);
  });

  it('已过日期自动推到下一年（非每年重复）', () => {
    const now = new Date();
    // 取一个一定早于今天的月日（用1月1日，若今天不是1月1日则必已过）
    if (now.getMonth() !== 0 || now.getDate() !== 1) {
      const r = parseNaturalDate('1月1日');
      expect(r).not.toBeNull();
      expect(r!.start.getFullYear()).toBe(now.getFullYear() + 1);
    }
  });
});

describe('parseNaturalDate - 农历', () => {
  it('农历8月15 解析为农历并标记 isLunar', () => {
    const r = parseNaturalDate('农历8月15');
    expect(r).not.toBeNull();
    expect(r!.isLunar).toBe(true);
    expect(Number.isNaN(r!.start.getTime())).toBe(false); // 有效日期
  });

  it('生日（带日期）标记 repeatYearly', () => {
    const r = parseNaturalDate('12月25日生日');
    expect(r).not.toBeNull();
    expect(r!.repeatYearly).toBe(true);
    expect(r!.start.getMonth()).toBe(11);
    expect(r!.start.getDate()).toBe(25);
  });
});

describe('parseNaturalDate - 无法解析', () => {
  it('无意义文本返回 null', () => {
    expect(parseNaturalDate('随便写写')).toBeNull();
  });

  it('空串/纯空白返回 null', () => {
    expect(parseNaturalDate('')).toBeNull();
    expect(parseNaturalDate('   ')).toBeNull();
  });
});

describe('getCalendarGrid', () => {
  it('返回 6x7=42 天，周一起、周日止', () => {
    const grid = getCalendarGrid(new Date(2026, 7, 5)); // 2026-08-05
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1); // 周一
    expect(grid[grid.length - 1].getDay()).toBe(0); // 周日
  });
});

describe('getWeekdayChinese', () => {
  it('返回 周X 格式', () => {
    expect(getWeekdayChinese(new Date(2026, 7, 3))).toBe('周一'); // 2026-08-03 是周一
    expect(getWeekdayChinese(new Date(2026, 7, 9))).toBe('周日'); // 2026-08-09 周日
  });
});

describe('格式化', () => {
  it('formatTime -> HH:mm', () => {
    expect(formatTime(new Date(2026, 0, 1, 13, 5))).toBe('13:05');
  });
  it('formatDateTime -> MM月dd日 HH:mm', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 13, 5))).toBe('01月01日 13:05');
  });
  it('formatDateFull -> yyyy年MM月dd日', () => {
    expect(formatDateFull(new Date(2026, 0, 1))).toBe('2026年01月01日');
  });
});

describe('getLunarDate', () => {
  it('返回非空字符串', () => {
    const s = getLunarDate(new Date(2026, 0, 1));
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('节日与 isToday', () => {
  it('getLunarFestival 不抛错且返回 string|null', () => {
    const f = getLunarFestival(new Date(2026, 0, 1));
    expect(f === null || typeof f === 'string').toBe(true);
  });
  it('getSolarFestival 不抛错且返回 string|null', () => {
    const f = getSolarFestival(new Date(2026, 0, 1));
    expect(f === null || typeof f === 'string').toBe(true);
  });
  it('isToday 对今天返回 true，对明天返回 false', () => {
    expect(isToday(new Date())).toBe(true);
    const t = new Date();
    t.setDate(t.getDate() + 1);
    expect(isToday(t)).toBe(false);
  });
});

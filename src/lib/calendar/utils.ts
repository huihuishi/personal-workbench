import { Solar, Lunar } from 'lunar-typescript';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  addMinutes,
  getDay,
  getDate,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 获取农历日期文本
export function getLunarDate(date: Date): string {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const day = lunar.getDay();
  // 特殊处理初一显示月份
  if (day === 1) {
    return lunar.getMonthInChinese() + '月';
  }
  return lunar.getDayInChinese();
}

// 获取农历节日
export function getLunarFestival(date: Date): string | null {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const festivals = lunar.getFestivals();
  if (festivals.length > 0) return festivals[0];
  const jieQi = lunar.getJieQi();
  if (jieQi) return jieQi;
  return null;
}

// 获取公历节日
export function getSolarFestival(date: Date): string | null {
  const solar = Solar.fromDate(date);
  const festivals = solar.getFestivals();
  if (festivals.length > 0) return festivals[0];
  return null;
}

// 生成日历网格（6行7列）
export function getCalendarGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // 周一开始
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

// 格式化时间显示
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MM月dd日 HH:mm');
}

export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy年MM月dd日');
}

// 自然语言解析时间
// 支持: "明天下午3点" "后天上午10点" "下周三下午2点" "12月25日" "每天" 等
export function parseNaturalDate(input: string): { start: Date; end?: Date; repeatYearly: boolean; isLunar: boolean } | null {
  const now = new Date();
  let start = new Date(now);
  let end: Date | undefined = undefined;
  let repeatYearly = false;
  let isLunar = false;

  const text = input.trim();

  // 检测农历关键词
  if (text.includes('农历') || text.includes('阴历')) {
    isLunar = true;
  }

  // 检测每年重复
  if (text.includes('每年') || text.includes('生日')) {
    repeatYearly = true;
  }

  // 解析日期部分
  let dateMatched = false;

  // 今天
  if (text.includes('今天')) {
    dateMatched = true;
  }
  // 明天
  else if (text.includes('明天')) {
    start.setDate(start.getDate() + 1);
    dateMatched = true;
  }
  // 后天
  else if (text.includes('后天')) {
    start.setDate(start.getDate() + 2);
    dateMatched = true;
  }
  // 大后天
  else if (text.includes('大后天')) {
    start.setDate(start.getDate() + 3);
    dateMatched = true;
  }
  // 下周X
  else if (text.match(/下周([一二三四五六日天])/)) {
    const dayMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const m = text.match(/下周([一二三四五六日天])/);
    if (m) {
      const targetDay = dayMap[m[1]];
      const currentDay = start.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      start.setDate(start.getDate() + diff);
      dateMatched = true;
    }
  }
  // 周X / 星期X
  else if (text.match(/[周星期]([一二三四五六日天])/)) {
    const dayMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const m = text.match(/[周星期]([一二三四五六日天])/);
    if (m) {
      const targetDay = dayMap[m[1]];
      const currentDay = start.getDay();
      let diff = targetDay - currentDay;
      if (diff < 0) diff += 7;
      if (diff === 0 && (text.includes('下') || text.includes('下周'))) diff = 7;
      start.setDate(start.getDate() + diff);
      dateMatched = true;
    }
  }
  // X月X日/X号
  else if (text.match(/(\d{1,2})月(\d{1,2})[日号]/)) {
    const m = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
    if (m) {
      const month = parseInt(m[1]) - 1;
      const day = parseInt(m[2]);
      start.setMonth(month);
      start.setDate(day);
      // 如果日期已过，推到明年
      if (start < now && !repeatYearly) {
        start.setFullYear(start.getFullYear() + 1);
      }
      dateMatched = true;
    }
  }

  // 解析时间部分
  let hour = -1;
  let minute = 0;

  // 下午X点 / 上午X点 / 晚上X点
  const timeMatch = text.match(/(上午|下午|晚上|中午|凌晨)?\s*(\d{1,2})[点时](\d{1,2})?分?/);
  if (timeMatch) {
    const period = timeMatch[1];
    hour = parseInt(timeMatch[2]);
    if (timeMatch[3]) {
      minute = parseInt(timeMatch[3]);
    }

    if (period === '下午' || period === '晚上') {
      if (hour < 12) hour += 12;
    } else if (period === '中午') {
      if (hour < 12) hour += 12;
    } else if (period === '凌晨') {
      // 凌晨不变
    }
    // 上午不变
  }
  // X点半
  else if (text.match(/(上午|下午|晚上|中午)?\s*(\d{1,2})点半/)) {
    const m = text.match(/(上午|下午|晚上|中午)?\s*(\d{1,2})点半/);
    if (m) {
      const period = m[1];
      hour = parseInt(m[2]);
      minute = 30;
      if (period === '下午' || period === '晚上' || period === '中午') {
        if (hour < 12) hour += 12;
      }
    }
  }

  if (hour >= 0) {
    start.setHours(hour, minute, 0, 0);
  } else if (dateMatched) {
    // 有日期但没时间，默认上午9点
    start.setHours(9, 0, 0, 0);
  } else {
    return null; // 无法解析
  }

  // 如果是农历日期，转换
  if (isLunar && dateMatched) {
    try {
      const lunar = Lunar.fromYmd(start.getFullYear(), start.getMonth() + 1, start.getDate());
      const solar = lunar.getSolar();
      start = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), start.getHours(), start.getMinutes());
    } catch {
      // 转换失败就用公历
    }
  }

  // 默认结束时间为开始时间后1小时
  end = addMinutes(start, 60);

  // 如果每年重复，确保日期有效
  if (repeatYearly) {
    // 生日等重复事件，年份不重要
  }

  return { start, end, repeatYearly, isLunar };
}

// 获取星期几的中文
export function getWeekdayChinese(date: Date): string {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return '周' + days[date.getDay()];
}

// 检查日期是否是今天
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

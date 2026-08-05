/**
 * CSV 支出导入的纯函数解析逻辑。
 *
 * 抽出为纯函数是为了可单测，并确保「实际入库的金额」与「扣减余额的金额」
 * 始终一致 —— 旧实现里余额扣减遍历了所有行（含格式不合法的单行数字），
 * 导致一条 `100` 这样缺少日期列的行会扣余额却不入库，造成账目不平。
 */

export interface ParsedCsvExpense {
  amount: number;
  date: string;
  category: string | null;
  description: string | null;
}

const stripQuotes = (s: string): string => s.trim().replace(/^["']|["']$/g, '');

/**
 * 解析 CSV 文本为支出记录数组。
 * 规则（与页面导入行为一致）：
 *  - 每行格式：金额,日期,分类,描述
 *  - 列数 < 2 的行忽略（无法构成有效记录）
 *  - 金额无法转为数字的行忽略
 *  - 缺日期时使用 fallbackDate
 */
export function parseCsvExpenses(csvText: string, fallbackDate: string): ParsedCsvExpense[] {
  const lines = csvText.trim().split('\n');
  const result: ParsedCsvExpense[] = [];
  for (const line of lines) {
    const parts = line.split(',').map(stripQuotes);
    if (parts.length < 2) continue;
    const amount = Number(parts[0]);
    if (Number.isNaN(amount)) continue;
    result.push({
      amount,
      date: parts[1] || fallbackDate,
      category: parts[2] || null,
      description: parts[3] || null,
    });
  }
  return result;
}

/** 返回将实际入库的所有 CSV 金额之和，用于扣减银行卡余额（与入库金额严格一致）。 */
export function sumCsvAmount(csvText: string, fallbackDate = ''): number {
  return parseCsvExpenses(csvText, fallbackDate).reduce((s, e) => s + e.amount, 0);
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import { addMonths, format, isSameDay, isSameMonth, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getCalendarGrid, getLunarDate, getLunarFestival, getSolarFestival, isToday, formatTime, parseNaturalDate } from '@/lib/calendar/utils';
import { getMonthUtcRange } from '@/lib/datetime';
import type { CalendarEvent } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalIcon, X, Repeat, Moon } from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showDetail, setShowDetail] = useState<CalendarEvent | null>(null);
  const [nlpInput, setNlpInput] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [isLunar, setIsLunar] = useState(false);
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [remindBefore, setRemindBefore] = useState(30);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { gte: monthGte, lt: monthLt } = getMonthUtcRange(currentDate);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', monthGte)
        .lt('start_time', monthLt)
        .order('start_time', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error('获取日程失败:', e);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const grid = getCalendarGrid(currentDate);
  const monthLabel = format(currentDate, 'yyyy年MM月', { locale: zhCN });

  // 获取某天的事件
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((e) => isSameDay(new Date(e.start_time), date));
  };

  // 处理自然语言输入
  const handleNLPInput = (text: string) => {
    setNlpInput(text);
    const parsed = parseNaturalDate(text);
    if (parsed) {
      setEventStart(format(parsed.start, "yyyy-MM-dd'T'HH:mm"));
      if (parsed.end) {
        setEventEnd(format(parsed.end, "yyyy-MM-dd'T'HH:mm"));
      }
      setIsLunar(parsed.isLunar);
      setRepeatYearly(parsed.repeatYearly);
      // 从文本中提取标题（去掉时间相关的词）
      let title = text
        .replace(/(今天|明天|后天|大后天|下周[一二三四五六日天]|[周星期][一二三四五六日天]|\d{1,2}月\d{1,2}[日号])/g, '')
        .replace(/(上午|下午|晚上|中午|凌晨)?\s*\d{1,2}[点时](\d{1,2})?分?半?/g, '')
        .replace(/(农历|阴历|每年|生日)/g, '')
        .trim();
      if (!title) title = text;
      setEventTitle(title);
    }
  };

  // 保存事件
  const handleSaveEvent = async () => {
    if (!user) return;
    if (!eventTitle.trim() || !eventStart) {
      toast.error('请填写标题和时间');
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        title: eventTitle.trim(),
        description: null,
        start_time: new Date(eventStart).toISOString(),
        end_time: eventEnd ? new Date(eventEnd).toISOString() : null,
        is_lunar: isLunar,
        repeat_yearly: repeatYearly,
        remind_before_minutes: remindBefore,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(payload)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('修改成功');
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert(payload);
        if (error) throw error;
        toast.success('创建成功');
      }
      setShowEventForm(false);
      resetForm();
      fetchEvents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  // 删除事件
  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('删除成功');
      setShowDetail(null);
      fetchEvents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const resetForm = () => {
    setEventTitle('');
    setEventStart('');
    setEventEnd('');
    setIsLunar(false);
    setRepeatYearly(false);
    setRemindBefore(30);
    setNlpInput('');
    setEditingEvent(null);
  };

  const openNewEvent = (date?: Date) => {
    resetForm();
    const baseDate = date || new Date();
    baseDate.setHours(9, 0, 0, 0);
    setEventStart(format(baseDate, "yyyy-MM-dd'T'HH:mm"));
    baseDate.setHours(10, 0, 0, 0);
    setEventEnd(format(baseDate, "yyyy-MM-dd'T'HH:mm"));
    setShowEventForm(true);
  };

  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventStart(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
    setEventEnd(event.end_time ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm") : '');
    setIsLunar(event.is_lunar);
    setRepeatYearly(event.repeat_yearly);
    setRemindBefore(event.remind_before_minutes || 30);
    setShowDetail(null);
    setShowEventForm(true);
  };

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalIcon size={20} /> 日程日历
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            今天
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium min-w-24 text-center">{monthLabel}</span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => openNewEvent()}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
          >
            <Plus size={16} /> 新建
          </button>
        </div>
      </div>

      {/* 日历主体 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekdays.map((w) => (
            <div key={w} className="text-center py-2 text-xs font-medium text-gray-500">
              周{w}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7">
          {grid.map((date, i) => {
            const dayEvents = getEventsForDay(date);
            const inMonth = isSameMonth(date, currentDate);
            const today = isToday(date);
            const lunar = getLunarDate(date);
            const festival = getLunarFestival(date) || getSolarFestival(date);
            const isSunday = getDay(date) === 0;
            const isSaturday = getDay(date) === 6;

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`min-h-16 sm:min-h-20 border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-blue-50/50 transition ${
                  !inMonth ? 'bg-gray-50/50 text-gray-300' : ''
                } ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm ${
                      today
                        ? 'bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold'
                        : isSunday
                        ? 'text-red-500'
                        : isSaturday
                        ? 'text-blue-500'
                        : 'text-gray-700'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {festival && inMonth && (
                    <span className="text-[10px] text-orange-500 truncate max-w-12 hidden sm:block">
                      {festival}
                    </span>
                  )}
                </div>
                {/* 农历 */}
                {inMonth && (
                  <span className="text-[10px] text-gray-400 block hidden sm:block">
                    {lunar}
                  </span>
                )}
                {/* 事件 */}
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setShowDetail(e);
                      }}
                      className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate flex items-center gap-0.5 ${
                        e.is_lunar
                          ? 'bg-purple-50 text-purple-600'
                          : e.repeat_yearly
                          ? 'bg-green-50 text-green-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {e.repeat_yearly && <Repeat size={8} className="flex-shrink-0" />}
                      {e.is_lunar && <Moon size={8} className="flex-shrink-0" />}
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中日期的事件列表 */}
      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">
              {format(selectedDate, 'MM月dd日')} 的日程
              <span className="text-xs text-gray-400 ml-2">
                {getLunarDate(selectedDate)}
              </span>
            </h2>
            <button
              onClick={() => openNewEvent(selectedDate)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
            >
              <Plus size={14} /> 添加
            </button>
          </div>
          {getEventsForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">这天没有日程</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDay(selectedDate).map((e) => (
                <div
                  key={e.id}
                  onClick={() => setShowDetail(e)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    e.is_lunar ? 'bg-purple-500' : e.repeat_yearly ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                      {e.repeat_yearly && <Repeat size={10} className="text-green-500" />}
                      {e.is_lunar && <Moon size={10} className="text-purple-500" />}
                      {e.title}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(e.start_time)}
                      {e.end_time && ` - ${formatTime(e.end_time)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新建/编辑事件弹窗 */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowEventForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">{editingEvent ? '编辑日程' : '新建日程'}</h3>
              <button onClick={() => setShowEventForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* 自然语言输入 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">智能输入（试试：明天下午3点开会）</label>
                <input
                  type="text"
                  value={nlpInput}
                  onChange={(e) => handleNLPInput(e.target.value)}
                  placeholder="输入自然语言，自动解析时间"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 标题 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">标题</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="日程标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 时间 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">开始时间</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">结束时间</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 选项 */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={isLunar} onChange={(e) => setIsLunar(e.target.checked)} className="rounded" />
                  <Moon size={14} /> 农历
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={repeatYearly} onChange={(e) => setRepeatYearly(e.target.checked)} className="rounded" />
                  <Repeat size={14} /> 每年重复
                </label>
              </div>

              {/* 提醒 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">提前提醒（分钟）</label>
                <select
                  value={remindBefore}
                  onChange={(e) => setRemindBefore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>不提醒</option>
                  <option value={5}>5分钟</option>
                  <option value={15}>15分钟</option>
                  <option value={30}>30分钟</option>
                  <option value={60}>1小时</option>
                  <option value={1440}>1天</option>
                </select>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEvent}
                  className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  {editingEvent ? '保存修改' : '创建日程'}
                </button>
                {editingEvent && (
                  <button
                    onClick={() => editingEvent && handleDeleteEvent(editingEvent.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 事件详情弹窗 */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">日程详情</h3>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {showDetail.repeat_yearly && <Repeat size={16} className="text-green-500" />}
                  {showDetail.is_lunar && <Moon size={16} className="text-purple-500" />}
                  {showDetail.title}
                </h4>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span>
                    {formatTime(showDetail.start_time)}
                    {showDetail.end_time && ` - ${formatTime(showDetail.end_time)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalIcon size={14} className="text-gray-400" />
                  <span>{format(new Date(showDetail.start_time), 'yyyy年MM月dd日')}</span>
                  {showDetail.is_lunar && (
                    <span className="text-purple-500 text-xs">农历</span>
                  )}
                  {showDetail.repeat_yearly && (
                    <span className="text-green-500 text-xs">每年重复</span>
                  )}
                </div>
                {showDetail.remind_before_minutes && showDetail.remind_before_minutes > 0 && (
                  <div className="flex items-center gap-2 text-blue-500">
                    <span className="text-xs">提前 {showDetail.remind_before_minutes} 分钟提醒</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEditEvent(showDetail)}
                  className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteEvent(showDetail.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Goal, GoalTask } from '@/types';
import {
  Target,
  Plus,
  X,
  Check,
  Trash2,
  Edit2,
  ChevronDown,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Circle,
} from 'lucide-react';

export default function GoalsPage() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, GoalTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // 目标编辑弹窗
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalYear, setGoalYear] = useState(new Date().getFullYear());

  // 进度手动调整弹窗
  const [editingProgressGoal, setEditingProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  // 添加子任务
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTaskGoalId, setAddingTaskGoalId] = useState<string | null>(null);

  // ---------- 数据加载 ----------
  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const allGoals = (data || []) as Goal[];
      setGoals(allGoals);

      // 计算可选年份
      const years = Array.from(new Set(allGoals.map((g) => g.year)));
      if (years.length === 0) years.push(new Date().getFullYear());
      years.sort((a, b) => b - a);
      setAvailableYears(years);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载目标失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTasks = useCallback(
    async (goalId: string) => {
      try {
        const { data, error } = await supabase
          .from('goal_tasks')
          .select('*')
          .eq('goal_id', goalId)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        setTasksMap((prev) => ({ ...prev, [goalId]: (data || []) as GoalTask[] }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载子任务失败');
      }
    },
    [],
  );

  const fetchAllTasks = useCallback(
    async (goalIds: string[]) => {
      if (goalIds.length === 0) {
        setTasksMap({});
        return;
      }
      try {
        const { data, error } = await supabase
          .from('goal_tasks')
          .select('*')
          .in('goal_id', goalIds)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        const map: Record<string, GoalTask[]> = {};
        (data || []).forEach((task) => {
          const t = task as GoalTask;
          if (!map[t.goal_id]) map[t.goal_id] = [];
          map[t.goal_id].push(t);
        });
        setTasksMap(map);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载子任务失败');
      }
    },
    [],
  );

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // 当 goals 更新后，批量加载当前年份的 tasks
  useEffect(() => {
    const yearGoalIds = goals.filter((g) => g.year === selectedYear).map((g) => g.id);
    fetchAllTasks(yearGoalIds);
  }, [goals, selectedYear, fetchAllTasks]);

  // ---------- 年份筛选 ----------
  const yearGoals = useMemo(
    () => goals.filter((g) => g.year === selectedYear),
    [goals, selectedYear],
  );

  // ---------- 统计 ----------
  const stats = useMemo(() => {
    const total = yearGoals.length;
    const completed = yearGoals.filter((g) => g.progress >= 100).length;
    const avgProgress =
      total > 0
        ? Math.round(yearGoals.reduce((sum, g) => sum + g.progress, 0) / total)
        : 0;
    return { total, completed, avgProgress };
  }, [yearGoals]);

  // ---------- 进度计算 ----------
  const calcProgress = (tasks: GoalTask[]): number => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.is_completed).length;
    return Math.round((done / tasks.length) * 100);
  };

  const updateGoalProgressInDB = async (goalId: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ progress })
        .eq('id', goalId);
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新进度失败');
    }
  };

  const recalcAndSyncProgress = async (goalId: string) => {
    const tasks = tasksMap[goalId] || [];
    const newProgress = calcProgress(tasks);
    await updateGoalProgressInDB(goalId, newProgress);
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)),
    );
  };

  // ---------- 目标 CRUD ----------
  const resetGoalForm = () => {
    setGoalTitle('');
    setGoalDesc('');
    setGoalYear(new Date().getFullYear());
    setEditingGoal(null);
  };

  const openCreateGoal = () => {
    resetGoalForm();
    setGoalYear(selectedYear);
    setShowGoalForm(true);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalTitle(goal.title);
    setGoalDesc(goal.description || '');
    setGoalYear(goal.year);
    setShowGoalForm(true);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    if (!goalTitle.trim()) {
      toast.error('请输入目标标题');
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        title: goalTitle.trim(),
        description: goalDesc.trim() || null,
        year: goalYear,
        progress: editingGoal ? editingGoal.progress : 0,
      };
      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update({
            title: payload.title,
            description: payload.description,
            year: payload.year,
          })
          .eq('id', editingGoal.id);
        if (error) throw error;
        toast.success('修改成功');
      } else {
        const { error } = await supabase.from('goals').insert(payload);
        if (error) throw error;
        toast.success('创建成功');
      }
      setShowGoalForm(false);
      resetGoalForm();
      fetchGoals();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!confirm('确定删除此目标？关联的子任务也会被删除。')) return;
    try {
      await supabase.from('goal_tasks').delete().eq('goal_id', goal.id);
      const { error } = await supabase.from('goals').delete().eq('id', goal.id);
      if (error) throw error;
      toast.success('删除成功');
      if (expandedGoalId === goal.id) setExpandedGoalId(null);
      fetchGoals();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ---------- 子任务 CRUD ----------
  const handleAddTask = async (goalId: string) => {
    if (!newTaskTitle.trim()) {
      toast.error('请输入子任务标题');
      return;
    }
    try {
      const currentTasks = tasksMap[goalId] || [];
      const { data, error } = await supabase
        .from('goal_tasks')
        .insert({
          goal_id: goalId,
          title: newTaskTitle.trim(),
          is_completed: false,
          sort_order: currentTasks.length,
        })
        .select()
        .single();
      if (error) throw error;

      const newTask = data as GoalTask;
      const updatedTasks = [...currentTasks, newTask];
      setTasksMap((prev) => ({ ...prev, [goalId]: updatedTasks }));

      // 自动更新进度
      const newProgress = calcProgress(updatedTasks);
      await updateGoalProgressInDB(goalId, newProgress);
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)),
      );

      setNewTaskTitle('');
      toast.success('已添加子任务');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加子任务失败');
    }
  };

  const toggleTask = async (goalId: string, task: GoalTask) => {
    const currentTasks = tasksMap[goalId] || [];
    const updatedTasks = currentTasks.map((t) =>
      t.id === task.id ? { ...t, is_completed: !t.is_completed } : t,
    );
    // 乐观更新
    setTasksMap((prev) => ({ ...prev, [goalId]: updatedTasks }));
    try {
      const { error } = await supabase
        .from('goal_tasks')
        .update({ is_completed: !task.is_completed })
        .eq('id', task.id);
      if (error) throw error;

      // 自动更新进度
      const newProgress = calcProgress(updatedTasks);
      await updateGoalProgressInDB(goalId, newProgress);
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)),
      );
    } catch (e) {
      // 回滚
      setTasksMap((prev) => ({ ...prev, [goalId]: currentTasks }));
      toast.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  const handleDeleteTask = async (goalId: string, taskId: string) => {
    const currentTasks = tasksMap[goalId] || [];
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    setTasksMap((prev) => ({ ...prev, [goalId]: updatedTasks }));
    try {
      const { error } = await supabase.from('goal_tasks').delete().eq('id', taskId);
      if (error) throw error;

      // 自动更新进度
      const newProgress = calcProgress(updatedTasks);
      await updateGoalProgressInDB(goalId, newProgress);
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress } : g)),
      );
    } catch (e) {
      // 回滚
      setTasksMap((prev) => ({ ...prev, [goalId]: currentTasks }));
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ---------- 手动调整进度 ----------
  const openProgressEditor = (goal: Goal) => {
    setEditingProgressGoal(goal);
    setProgressValue(goal.progress);
  };

  const handleSaveProgress = async () => {
    if (!editingProgressGoal) return;
    const clamped = Math.max(0, Math.min(100, progressValue));
    try {
      const { error } = await supabase
        .from('goals')
        .update({ progress: clamped })
        .eq('id', editingProgressGoal.id);
      if (error) throw error;
      toast.success('进度已更新');
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingProgressGoal.id ? { ...g, progress: clamped } : g,
        ),
      );
      setEditingProgressGoal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新进度失败');
    }
  };

  // ---------- 渲染辅助 ----------
  const progressColor = (p: number) => {
    if (p >= 100) return 'bg-green-500';
    if (p >= 80) return 'bg-green-500';
    if (p >= 50) return 'bg-blue-500';
    if (p >= 20) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const toggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
    setAddingTaskGoalId(null);
    setNewTaskTitle('');
  };

  // ---------- 加载态 ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        加载中...
      </div>
    );
  }

  // ---------- 主视图 ----------
  return (
    <div className="space-y-4">
      {/* 标题 + 年份选择 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Target size={20} className="text-blue-500" /> 年度目标
        </h1>
        <div className="flex items-center gap-2">
          {/* 年份切换 */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none pl-9 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <Calendar
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
          {/* 新建目标 */}
          <button
            onClick={openCreateGoal}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
          >
            <Plus size={16} /> 新建目标
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Target size={14} /> 总目标
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <CheckCircle2 size={14} /> 已完成
          </div>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <TrendingUp size={14} /> 平均进度
          </div>
          <p className="text-2xl font-bold text-blue-500">{stats.avgProgress}%</p>
        </div>
      </div>

      {/* 目标列表 */}
      {yearGoals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 mb-2">
            {selectedYear} 年还没有目标
          </p>
          <p className="text-xs text-gray-300">点击「新建目标」开始规划你的年度计划</p>
        </div>
      ) : (
        <div className="space-y-3">
          {yearGoals.map((goal) => {
            const tasks = tasksMap[goal.id] || [];
            const doneCount = tasks.filter((t) => t.is_completed).length;
            const isExpanded = expandedGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* 卡片头部 */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleExpand(goal.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Target size={18} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-800 truncate">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          {format(new Date(goal.created_at), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openProgressEditor(goal)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition"
                        title="手动调整进度"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => openEditGoal(goal)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition"
                        title="编辑目标"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition"
                        title="删除目标"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div
                    className="mt-3 cursor-pointer"
                    onClick={() => toggleExpand(goal.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        子任务 {doneCount}/{tasks.length}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(goal.progress)}`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 展开按钮 */}
                  {tasks.length > 0 && (
                    <button
                      onClick={() => toggleExpand(goal.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      {isExpanded ? '收起子任务' : `查看子任务 (${tasks.length})`}
                    </button>
                  )}
                </div>

                {/* 子任务区域（展开时） */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-2">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">
                        还没有子任务，在下方添加
                      </p>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 group bg-white rounded-lg border border-gray-100 px-3 py-2"
                        >
                          <button
                            onClick={() => toggleTask(goal.id, task)}
                            className="flex-shrink-0 transition"
                          >
                            {task.is_completed ? (
                              <CheckCircle2 size={18} className="text-green-500" />
                            ) : (
                              <Circle size={18} className="text-gray-300 hover:text-blue-400" />
                            )}
                          </button>
                          <span
                            className={`flex-1 text-sm ${
                              task.is_completed
                                ? 'text-gray-400 line-through'
                                : 'text-gray-700'
                            }`}
                          >
                            {task.title}
                          </span>
                          <button
                            onClick={() => handleDeleteTask(goal.id, task.id)}
                            className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            title="删除子任务"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}

                    {/* 添加子任务 */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={addingTaskGoalId === goal.id ? newTaskTitle : ''}
                        onFocus={() => setAddingTaskGoalId(goal.id)}
                        onChange={(e) => {
                          setAddingTaskGoalId(goal.id);
                          setNewTaskTitle(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTask(goal.id);
                          }
                        }}
                        placeholder="添加子任务，回车确认"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      {addingTaskGoalId === goal.id && newTaskTitle.trim() && (
                        <button
                          onClick={() => handleAddTask(goal.id)}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 目标编辑/创建弹窗 */}
      {showGoalForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowGoalForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">
                {editingGoal ? '编辑目标' : '新建目标'}
              </h3>
              <button
                onClick={() => setShowGoalForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">目标标题</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="如：读完 12 本书、减重 10kg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">描述（可选）</label>
                <textarea
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  placeholder="目标描述"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">年份</label>
                <input
                  type="number"
                  value={goalYear}
                  onChange={(e) => setGoalYear(Number(e.target.value))}
                  min={2000}
                  max={2100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSaveGoal}
                className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                {editingGoal ? '保存修改' : '创建目标'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 进度手动调整弹窗 */}
      {editingProgressGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingProgressGoal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">手动调整进度</h3>
              <button
                onClick={() => setEditingProgressGoal(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-gray-400 text-center truncate">
                {editingProgressGoal.title}
              </p>
              <div className="text-center">
                <span className="text-3xl font-bold text-blue-600">
                  {progressValue}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex gap-2">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setProgressValue(v)}
                    className={`flex-1 py-1.5 text-xs rounded-lg transition ${
                      progressValue === v
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveProgress}
                className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

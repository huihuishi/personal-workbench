'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Skill, LearningMaterial } from '@/types';
import {
  GraduationCap,
  Plus,
  X,
  BookOpen,
  Check,
  Trash2,
  Edit2,
  Link,
  FileText,
  ChevronLeft,
} from 'lucide-react';

type ContentType = 'text' | 'url' | 'file';

export default function LearningPage() {
  const { user } = useAuthStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // 技能表单
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillProgress, setSkillProgress] = useState(0);

  // 资料表单
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matContentType, setMatContentType] = useState<ContentType>('text');
  const [matContent, setMatContent] = useState('');

  // 进度编辑
  const [editingProgress, setEditingProgress] = useState<Skill | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  // ---------- 数据加载 ----------
  const fetchSkills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSkills((data || []) as Skill[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载技能失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMaterials = useCallback(async (skillId: string) => {
    try {
      const { data, error } = await supabase
        .from('learning_materials')
        .select('*')
        .eq('skill_id', skillId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setMaterials((data || []) as LearningMaterial[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载学习资料失败');
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (selectedSkill) {
      fetchMaterials(selectedSkill.id);
    } else {
      setMaterials([]);
    }
  }, [selectedSkill, fetchMaterials]);

  // ---------- 技能 CRUD ----------
  const resetSkillForm = () => {
    setSkillName('');
    setSkillDesc('');
    setSkillProgress(0);
    setEditingSkill(null);
  };

  const openCreateSkill = () => {
    resetSkillForm();
    setShowSkillForm(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillDesc(skill.description || '');
    setSkillProgress(skill.progress);
    setShowSkillForm(true);
  };

  const handleSaveSkill = async () => {
    if (!user) return;
    if (!skillName.trim()) {
      toast.error('请输入技能名称');
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        name: skillName.trim(),
        description: skillDesc.trim() || null,
        progress: Math.max(0, Math.min(100, skillProgress)),
      };
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update(payload)
          .eq('id', editingSkill.id);
        if (error) throw error;
        toast.success('修改成功');
      } else {
        const { error } = await supabase.from('skills').insert(payload);
        if (error) throw error;
        toast.success('创建成功');
      }
      setShowSkillForm(false);
      resetSkillForm();
      fetchSkills();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('确定删除此技能？关联的学习资料也会被删除。')) return;
    try {
      // 先删除关联资料
      await supabase.from('learning_materials').delete().eq('skill_id', id);
      const { error } = await supabase.from('skills').delete().eq('id', id);
      if (error) throw error;
      toast.success('删除成功');
      if (selectedSkill?.id === id) {
        setSelectedSkill(null);
      }
      fetchSkills();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ---------- 进度调整 ----------
  const openProgressEditor = (skill: Skill) => {
    setEditingProgress(skill);
    setProgressValue(skill.progress);
  };

  const handleSaveProgress = async () => {
    if (!editingProgress) return;
    const clamped = Math.max(0, Math.min(100, progressValue));
    try {
      const { error } = await supabase
        .from('skills')
        .update({ progress: clamped })
        .eq('id', editingProgress.id);
      if (error) throw error;
      toast.success('进度已更新');
      // 更新本地状态
      setSkills((prev) =>
        prev.map((s) => (s.id === editingProgress.id ? { ...s, progress: clamped } : s)),
      );
      if (selectedSkill?.id === editingProgress.id) {
        setSelectedSkill({ ...selectedSkill, progress: clamped });
      }
      setEditingProgress(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新进度失败');
    }
  };

  // ---------- 学习资料 CRUD ----------
  const resetMaterialForm = () => {
    setMatTitle('');
    setMatContentType('text');
    setMatContent('');
  };

  const openMaterialForm = () => {
    resetMaterialForm();
    setShowMaterialForm(true);
  };

  const handleSaveMaterial = async () => {
    if (!user || !selectedSkill) return;
    if (!matTitle.trim()) {
      toast.error('请输入资料标题');
      return;
    }
    if (!matContent.trim()) {
      toast.error('请输入资料内容');
      return;
    }
    if (matContentType === 'url') {
      try {
        new URL(matContent.trim());
      } catch {
        toast.error('请输入有效的链接地址');
        return;
      }
    }
    try {
      const { error } = await supabase.from('learning_materials').insert({
        skill_id: selectedSkill.id,
        title: matTitle.trim(),
        content_type: matContentType,
        content: matContent.trim(),
        is_read: false,
        sort_order: materials.length,
      });
      if (error) throw error;
      toast.success('添加成功');
      setShowMaterialForm(false);
      resetMaterialForm();
      fetchMaterials(selectedSkill.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加资料失败');
    }
  };

  const toggleMaterialRead = async (mat: LearningMaterial) => {
    try {
      const { error } = await supabase
        .from('learning_materials')
        .update({ is_read: !mat.is_read })
        .eq('id', mat.id);
      if (error) throw error;
      setMaterials((prev) =>
        prev.map((m) => (m.id === mat.id ? { ...m, is_read: !m.is_read } : m)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('确定删除此学习资料？')) return;
    try {
      const { error } = await supabase
        .from('learning_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('删除成功');
      if (selectedSkill) {
        fetchMaterials(selectedSkill.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ---------- 渲染辅助 ----------
  const progressColor = (p: number) => {
    if (p >= 80) return 'bg-green-500';
    if (p >= 50) return 'bg-blue-500';
    if (p >= 20) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const contentTypeIcon = (type: ContentType) => {
    if (type === 'url') return <Link size={14} className="text-blue-500" />;
    if (type === 'file') return <FileText size={14} className="text-purple-500" />;
    return <FileText size={14} className="text-gray-400" />;
  };

  const renderMaterialContent = (mat: LearningMaterial) => {
    if (mat.content_type === 'url') {
      return (
        <a
          href={mat.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline break-all text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {mat.content}
        </a>
      );
    }
    return (
      <p className={`text-sm text-gray-600 whitespace-pre-wrap break-words ${mat.is_read ? 'line-through opacity-60' : ''}`}>
        {mat.content}
      </p>
    );
  };

  const readCount = materials.filter((m) => m.is_read).length;
  const readPercent = materials.length > 0 ? Math.round((readCount / materials.length) * 100) : 0;

  // ---------- 加载态 ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        加载中...
      </div>
    );
  }

  // ---------- 技能详情视图 ----------
  if (selectedSkill) {
    return (
      <div className="space-y-4">
        {/* 返回 + 标题 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSkill(null)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate flex items-center gap-2">
              <GraduationCap size={18} className="text-blue-500 flex-shrink-0" />
              {selectedSkill.name}
            </h1>
            {selectedSkill.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedSkill.description}</p>
            )}
          </div>
          <button
            onClick={() => openEditSkill(selectedSkill)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteSkill(selectedSkill.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* 进度卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">学习进度</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-600">{selectedSkill.progress}%</span>
              <button
                onClick={() => openProgressEditor(selectedSkill)}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                调整
              </button>
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor(selectedSkill.progress)}`}
              style={{ width: `${selectedSkill.progress}%` }}
            />
          </div>
          {materials.length > 0 && (
            <p className="text-xs text-gray-400">
              资料阅读 {readCount}/{materials.length}（{readPercent}%）
            </p>
          )}
        </div>

        {/* 资料列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
              <BookOpen size={16} /> 学习资料
            </h2>
            <button
              onClick={openMaterialForm}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
            >
              <Plus size={14} /> 添加资料
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              还没有学习资料，点击「添加资料」开始学习吧
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {contentTypeIcon(mat.content_type)}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium ${mat.is_read ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {mat.title}
                        </h3>
                        <div className="mt-1">
                          {renderMaterialContent(mat)}
                        </div>
                        <p className="text-xs text-gray-300 mt-1">
                          {format(new Date(mat.created_at), 'MM-dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleMaterialRead(mat)}
                        className={`p-1.5 rounded-lg transition ${
                          mat.is_read
                            ? 'text-green-500 hover:bg-green-50'
                            : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                        }`}
                        title={mat.is_read ? '标记为未读' : '标记为已读'}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMaterial(mat.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 进度调整弹窗 */}
        {editingProgress && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setEditingProgress(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold">调整进度</h3>
                <button
                  onClick={() => setEditingProgress(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <span className="text-3xl font-bold text-blue-600">{progressValue}%</span>
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

        {/* 资料表单弹窗 */}
        {showMaterialForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowMaterialForm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                <h3 className="font-semibold">添加学习资料</h3>
                <button
                  onClick={() => setShowMaterialForm(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">标题</label>
                  <input
                    type="text"
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="资料标题"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">类型</label>
                  <div className="flex gap-2">
                    {([
                      { key: 'text' as const, label: '文本', icon: <FileText size={14} /> },
                      { key: 'url' as const, label: '链接', icon: <Link size={14} /> },
                      { key: 'file' as const, label: '文件', icon: <FileText size={14} /> },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setMatContentType(opt.key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm rounded-lg border transition ${
                          matContentType === opt.key
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {matContentType === 'url' ? '链接地址' : matContentType === 'file' ? '文件描述/路径' : '内容'}
                  </label>
                  {matContentType === 'text' ? (
                    <textarea
                      value={matContent}
                      onChange={(e) => setMatContent(e.target.value)}
                      placeholder="输入学习内容..."
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <input
                      type={matContentType === 'url' ? 'url' : 'text'}
                      value={matContent}
                      onChange={(e) => setMatContent(e.target.value)}
                      placeholder={matContentType === 'url' ? 'https://...' : '文件路径或描述'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <button
                  onClick={handleSaveMaterial}
                  className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 技能编辑弹窗（在详情页也可用） */}
        {showSkillForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowSkillForm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold">{editingSkill ? '编辑技能' : '添加技能'}</h3>
                <button
                  onClick={() => setShowSkillForm(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="技能名称（如：英语、吉他）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={skillDesc}
                  onChange={(e) => setSkillDesc(e.target.value)}
                  placeholder="技能描述（可选）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    初始进度：<span className="font-bold text-blue-600">{skillProgress}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={skillProgress}
                    onChange={(e) => setSkillProgress(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveSkill}
                  className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  {editingSkill ? '保存修改' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- 技能列表视图 ----------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <GraduationCap size={20} /> 技能学习
        </h1>
        <button
          onClick={openCreateSkill}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
        >
          <Plus size={16} /> 添加技能
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 mb-2">还没有学习中的技能</p>
          <p className="text-xs text-gray-300">点击「添加技能」开始你的学习之旅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => setSelectedSkill(skill)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={18} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-800 truncate">
                      {skill.name}
                    </h3>
                    {skill.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {skill.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditSkill(skill);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSkill(skill.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* 进度条 */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">进度</span>
                  <span className="text-xs font-bold text-blue-600">{skill.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(skill.progress)}`}
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 技能表单弹窗 */}
      {showSkillForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowSkillForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">{editingSkill ? '编辑技能' : '添加技能'}</h3>
              <button
                onClick={() => setShowSkillForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="技能名称（如：英语、吉他）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                placeholder="技能描述（可选）"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  初始进度：<span className="font-bold text-blue-600">{skillProgress}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={skillProgress}
                  onChange={(e) => setSkillProgress(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <button
                onClick={handleSaveSkill}
                className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                {editingSkill ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

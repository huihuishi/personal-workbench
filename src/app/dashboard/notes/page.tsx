'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Note } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  StickyNote,
  Plus,
  Search,
  Trash2,
  Edit2,
  Tag,
  Clock,
  X,
} from 'lucide-react';

export default function NotesPage() {
  const user = useAuthStore((s) => s.user);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 编辑弹窗状态
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  // 表单字段
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ========== 加载笔记 ==========
  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('加载笔记失败');
    } else {
      setNotes((data as Note[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // ========== 搜索过滤 ==========
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [notes, search]);

  // ========== 标签解析 ==========
  const parseTags = (raw: string): string[] =>
    raw
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

  // ========== 打开编辑弹窗 ==========
  const openEdit = (note: Note) => {
    setEditing(note);
    setCreating(false);
    setFormTitle(note.title || '');
    setFormContent(note.content);
    setFormTags(note.tags.join(', '));
  };

  // ========== 打开新建弹窗 ==========
  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
  };

  // ========== 关闭弹窗 ==========
  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  // ========== 保存 ==========
  const handleSave = async () => {
    if (!formContent.trim()) {
      toast.error('请输入内容');
      return;
    }
    if (!user) return;

    setSaving(true);
    const tags = parseTags(formTags);

    if (editing) {
      const { error } = await supabase
        .from('notes')
        .update({
          title: formTitle.trim() || null,
          content: formContent.trim(),
          tags,
        })
        .eq('id', editing.id);

      if (error) {
        toast.error('更新失败');
      } else {
        toast.success('笔记已更新');
        closeModal();
        loadNotes();
      }
    } else {
      const { error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: formTitle.trim() || null,
          content: formContent.trim(),
          tags,
        });

      if (error) {
        toast.error('创建失败');
      } else {
        toast.success('笔记已创建');
        closeModal();
        loadNotes();
      }
    }
    setSaving(false);
  };

  // ========== 删除 ==========
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;
    setDeletingId(id);
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('笔记已删除');
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
    setDeletingId(null);
  };

  // ========== 标签颜色映射 ==========
  const tagColors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-pink-100 text-pink-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  // ========== 内容预览 ==========
  const preview = (content: string, maxLen = 80) =>
    content.length > maxLen ? content.slice(0, maxLen) + '...' : content;

  // ========== 是否显示弹窗 ==========
  const showModal = creating || editing !== null;

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">随手记</h1>
          <p className="text-sm text-gray-400 mt-1">
            记录灵感、想法和待办事项
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm shrink-0"
        >
          <Plus size={16} />
          新建笔记
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="搜索笔记标题、内容或标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-shadow"
        />
      </div>

      {/* 笔记列表 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-yellow-50 rounded-xl p-4 shadow-sm animate-pulse h-40"
            >
              <div className="bg-yellow-100 rounded h-4 w-2/3 mb-3" />
              <div className="bg-yellow-100 rounded h-3 w-full mb-2" />
              <div className="bg-yellow-100 rounded h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <StickyNote size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm">
            {search.trim() ? '没有找到匹配的笔记' : '还没有笔记，点击上方按钮创建'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-yellow-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-yellow-100 group cursor-pointer"
              onClick={() => openEdit(note)}
            >
              {/* 标题 */}
              {note.title && (
                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1">
                  {note.title}
                </h3>
              )}

              {/* 内容预览 */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-3 whitespace-pre-wrap">
                {preview(note.content, 120)}
              </p>

              {/* 标签 */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 底部：时间 + 操作 */}
              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {format(new Date(note.created_at), 'MM-dd HH:mm', {
                    locale: zhCN,
                  })}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(note);
                    }}
                    className="p-1 rounded hover:bg-yellow-200 text-gray-500 hover:text-blue-600 transition-colors"
                    title="编辑"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    disabled={deletingId === note.id}
                    className="p-1 rounded hover:bg-yellow-200 text-gray-500 hover:text-red-600 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑/新建弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editing ? '编辑笔记' : '新建笔记'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-5 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  标题（可选）
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="给笔记起个标题..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  内容
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="写点什么..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                />
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  标签（逗号分隔）
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="工作, 生活, 灵感..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
                {formTags.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parseTags(formTags).map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

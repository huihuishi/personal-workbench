'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Item } from '@/types';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  X,
  Search,
  Trash2,
  Edit2,
  MapPin,
  AlertTriangle,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

// ─── 分类树工具函数 ───────────────────────────────────────────
interface CategoryNode {
  name: string;
  children: Record<string, CategoryNode>;
}

function buildCategoryTree(items: Item[]): CategoryNode {
  const root: CategoryNode = { name: '全部', children: {} };
  for (const item of items) {
    let current = root;
    for (const seg of item.category_path) {
      if (!current.children[seg]) {
        current.children[seg] = { name: seg, children: {} };
      }
      current = current.children[seg];
    }
  }
  return root;
}

// ─── 模态框组件 ────────────────────────────────────────────────
interface ItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ItemFormData) => Promise<void>;
  initial?: Item | null;
}

interface ItemFormData {
  name: string;
  category_path: string[];
  storage_location: string;
  quantity: number;
  expiry_date?: string;
  notes?: string;
}

function ItemModal({ open, onClose, onSave, initial }: ItemModalProps) {
  const [name, setName] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setName(initial.name);
        setCategoryInput(initial.category_path.join(' / '));
        setStorageLocation(initial.storage_location);
        setQuantity(initial.quantity);
        setExpiryDate(initial.expiry_date ?? '');
        setNotes(initial.notes ?? '');
      } else {
        setName('');
        setCategoryInput('');
        setStorageLocation('');
        setQuantity(1);
        setExpiryDate('');
        setNotes('');
      }
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('请输入物品名称');
      return;
    }
    if (!storageLocation.trim()) {
      toast.error('请输入收纳位置');
      return;
    }
    const categoryPath = categoryInput
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category_path: categoryPath,
        storage_location: storageLocation.trim(),
        quantity,
        expiry_date: expiryDate || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 弹窗 */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {initial ? '编辑物品' : '添加物品'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：生抽"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分类 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="例如：厨房 / 调料"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <p className="mt-1 text-xs text-gray-400">
              用 &quot;/&quot; 或空格分隔多级分类
            </p>
          </div>

          {/* 收纳位置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              收纳位置 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="例如：厨房吊柜左侧"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* 数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数量
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* 过期日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              过期日期
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选备注..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 分类树组件 ────────────────────────────────────────────────
function CategoryTreeItem({
  node,
  path,
  selectedPath,
  onSelect,
}: {
  node: CategoryNode;
  path: string[];
  selectedPath: string[];
  onSelect: (p: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = Object.values(node.children);

  if (children.length === 0) return null;

  const isSelected =
    JSON.stringify(selectedPath) === JSON.stringify(path);

  return (
    <div>
      <button
        onClick={() => {
          onSelect(path);
          setExpanded((v) => !v);
        }}
        className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
          isSelected
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {children.length > 0 && (
          <span className="text-gray-400">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        <span className={children.length === 0 ? 'ml-4' : ''}>
          {node.name}
        </span>
      </button>
      {expanded && children.length > 0 && (
        <div className="ml-3 border-l border-gray-100 pl-2">
          {children.map((child) => (
            <CategoryTreeItem
              key={child.name}
              node={child}
              path={[...path, child.name]}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 确认删除弹窗 ──────────────────────────────────────────────
function DeleteConfirmModal({
  open,
  itemName,
  onConfirm,
  onClose,
}: {
  open: boolean;
  itemName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">确认删除</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              确定要删除「{itemName}」吗？此操作不可撤销。
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────
export default function ItemsPage() {
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选 & 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string[]>(['全部']);
  const [selectedLocation, setSelectedLocation] = useState('');

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  // ─── 加载数据 ─────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('加载物品失败');
    } else {
      setItems((data as Item[]) ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ─── CRUD 操作 ────────────────────────────────────────────
  const handleCreate = async (form: ItemFormData) => {
    if (!user?.id) return;
    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name: form.name,
      category_path: form.category_path,
      storage_location: form.storage_location,
      quantity: form.quantity,
      expiry_date: form.expiry_date || null,
      notes: form.notes || null,
    });
    if (error) {
      toast.error('创建失败');
    } else {
      toast.success('已添加');
      loadItems();
    }
  };

  const handleUpdate = async (form: ItemFormData) => {
    if (!user?.id || !editingItem) return;
    const { error } = await supabase
      .from('items')
      .update({
        name: form.name,
        category_path: form.category_path,
        storage_location: form.storage_location,
        quantity: form.quantity,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      })
      .eq('id', editingItem.id);
    if (error) {
      toast.error('更新失败');
    } else {
      toast.success('已更新');
      setEditingItem(null);
      loadItems();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('已删除');
      setDeleteTarget(null);
      loadItems();
    }
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  // ─── 分类树 & 位置列表 ────────────────────────────────────
  const categoryTree = useMemo(() => buildCategoryTree(items), [items]);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.storage_location) set.add(i.storage_location);
    });
    return Array.from(set).sort();
  }, [items]);

  // ─── 筛选后的物品 ─────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;

    // 搜索
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    // 分类筛选
    if (
      selectedCategory.length > 0 &&
      selectedCategory[0] !== '全部'
    ) {
      result = result.filter((i) => {
        const itemPath = i.category_path;
        for (let idx = 0; idx < selectedCategory.length; idx++) {
          if (itemPath[idx] !== selectedCategory[idx]) return false;
        }
        return true;
      });
    }

    // 位置筛选
    if (selectedLocation) {
      result = result.filter(
        (i) => i.storage_location === selectedLocation
      );
    }

    return result;
  }, [items, searchQuery, selectedCategory, selectedLocation]);

  // ─── 过期状态判断 ─────────────────────────────────────────
  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = parseISO(dateStr);
    if (isBefore(expiry, today)) return 'expired';
    if (isBefore(expiry, addDays(today, 7))) return 'soon';
    return null;
  };

  const expiryStatusText = (status: 'expired' | 'soon') =>
    status === 'expired' ? '已过期' : '即将过期';

  // ─── 加载中 ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── 渲染 ─────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">物品管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            共 {items.length} 件物品
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          添加物品
        </button>
      </div>

      {/* 搜索 & 筛选区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索物品名称..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>

          {/* 位置筛选 */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-w-[140px]"
          >
            <option value="">全部位置</option>
            {allLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* 左侧：分类树 */}
        <div className="lg:w-48 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sticky top-24">
            <div className="flex items-center gap-2 mb-2 px-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                分类
              </span>
            </div>
            <CategoryTreeItem
              node={categoryTree}
              path={['全部']}
              selectedPath={selectedCategory}
              onSelect={(p) => setSelectedCategory(p)}
            />
          </div>
        </div>

        {/* 右侧：物品列表 */}
        <div className="flex-1 min-w-0">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {items.length === 0
                  ? '还没有物品，点击右上角添加第一个吧'
                  : '没有匹配的物品'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const expiryStatus = getExpiryStatus(item.expiry_date);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow group"
                  >
                    {/* 顶部：名称 + 操作 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-gray-800 truncate">
                          {item.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 分类路径 */}
                    {item.category_path.length > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Layers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500">
                          {item.category_path.join(' / ')}
                        </span>
                      </div>
                    )}

                    {/* 位置 */}
                    <div className="flex items-center gap-1 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">
                        {item.storage_location}
                      </span>
                    </div>

                    {/* 底部：数量 + 过期 + 备注 */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-400">
                        数量：{item.quantity}
                      </span>

                      {item.expiry_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span
                            className={`text-xs font-medium ${
                              expiryStatus === 'expired'
                                ? 'text-red-500'
                                : expiryStatus === 'soon'
                                ? 'text-orange-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {format(parseISO(item.expiry_date), 'yyyy-MM-dd')}
                            {expiryStatus && (
                              <span
                                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  expiryStatus === 'expired'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-orange-50 text-orange-600'
                                }`}
                              >
                                {expiryStatusText(expiryStatus)}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 备注 */}
                    {item.notes && (
                      <p className="mt-2 text-xs text-gray-400 line-clamp-1">
                        {item.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 模态框 */}
      <ItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSave={editingItem ? handleUpdate : handleCreate}
        initial={editingItem}
      />

      {/* 删除确认 */}
      <DeleteConfirmModal
        open={!!deleteTarget}
        itemName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

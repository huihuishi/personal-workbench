'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';
import toast from 'react-hot-toast';
import type { BodyPhoto, ClothingItem, OutfitCombination } from '@/types';
import {
  Camera, Upload, Plus, X, Trash2, Shirt, User, Layers, Save,
  ZoomIn, ZoomOut, Image as ImageIcon, Sparkles, Eye, RotateCcw,
} from 'lucide-react';

type Tab = 'photos' | 'clothing' | 'preview' | 'outfits';
type Angle = 'front' | 'back' | 'side';

interface OverlayItem {
  clothingId: string;
  clothing: ClothingItem;
  x: number; // 相对预览容器的百分比 0-100
  y: number;
  scale: number;
}

interface ClothingPos {
  x: number;
  y: number;
  scale: number;
}

const ANGLES: { key: Angle; label: string }[] = [
  { key: 'front', label: '正面' },
  { key: 'back', label: '背面' },
  { key: 'side', label: '侧面' },
];

const CATEGORIES = ['上衣', '裤子', '裙子', '外套', '鞋子', '配饰'];
const SEASONS = ['春', '夏', '秋', '冬', '四季'];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// 上传图片到 Storage，返回公开 URL
const uploadImage = async (file: File, folder: string, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${userId}/${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from('wardrobe')
    .upload(fileName, file, { upsert: true, cacheControl: '3600' });
  if (error) throw error;
  const { data } = supabase.storage.from('wardrobe').getPublicUrl(fileName);
  return data.publicUrl;
};

export default function WardrobePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('photos');

  const [bodyPhotos, setBodyPhotos] = useState<BodyPhoto[]>([]);
  const [clothing, setClothing] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<OutfitCombination[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- 人体照片上传表单 ----
  const [photoAngle, setPhotoAngle] = useState<Angle>('front');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ---- 衣物上传表单 ----
  const [clothName, setClothName] = useState('');
  const [clothCategory, setClothCategory] = useState(CATEGORIES[0]);
  const [clothColor, setClothColor] = useState('');
  const [clothSeason, setClothSeason] = useState(SEASONS[4]);
  const [uploadingCloth, setUploadingCloth] = useState(false);

  // ---- 抠图 ----
  const [cutoutLoadingId, setCutoutLoadingId] = useState<string | null>(null);

  // ---- 搭配预览 ----
  const [selectedBody, setSelectedBody] = useState<BodyPhoto | null>(null);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [savingOutfit, setSavingOutfit] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ---- 查看已保存搭配 ----
  const [viewOutfit, setViewOutfit] = useState<OutfitCombination | null>(null);

  // ==================== 数据加载 ====================
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bp, cl, of] = await Promise.all([
        supabase.from('body_photos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clothing_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('outfit_combinations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setBodyPhotos((bp.data as BodyPhoto[]) || []);
      setClothing((cl.data as ClothingItem[]) || []);
      setOutfits((of.data as OutfitCombination[]) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ==================== 人体照片 ====================
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(file, 'body', user.id);
      const { error } = await supabase
        .from('body_photos')
        .insert({ user_id: user.id, image_url: url, angle: photoAngle });
      if (error) throw error;
      toast.success('人体照片已上传');
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('确定删除这张人体照片？')) return;
    try {
      const { error } = await supabase.from('body_photos').delete().eq('id', id);
      if (error) throw error;
      if (selectedBody?.id === id) { setSelectedBody(null); setOverlays([]); }
      toast.success('已删除');
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  // ==================== 衣物 ====================
  const handleClothUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (!clothName.trim()) {
      toast.error('请填写衣物名称');
      return;
    }
    setUploadingCloth(true);
    try {
      const url = await uploadImage(file, 'clothing', user.id);
      const { error } = await supabase
        .from('clothing_items')
        .insert({
          user_id: user.id,
          name: clothName.trim(),
          image_url: url,
          category: clothCategory,
          color: clothColor.trim() || null,
          season: clothSeason,
        });
      if (error) throw error;
      toast.success('衣物已添加');
      setClothName(''); setClothColor(''); setClothCategory(CATEGORIES[0]); setClothSeason(SEASONS[4]);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingCloth(false);
    }
  };

  const deleteCloth = async (id: string) => {
    if (!confirm('确定删除这件衣物？')) return;
    try {
      const { error } = await supabase.from('clothing_items').delete().eq('id', id);
      if (error) throw error;
      setOverlays((prev) => prev.filter((o) => o.clothingId !== id));
      toast.success('已删除');
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  // ==================== 智能抠图 ====================
  const handleCutout = async (cloth: ClothingItem) => {
    if (!user || !cloth.image_url) return;
    if (cloth.cutout_url) {
      toast('这件衣物已经抠图啦');
      return;
    }
    setCutoutLoadingId(cloth.id);
    try {
      const { data, error } = await supabase.functions.invoke('cutout', {
        body: { imageUrl: cloth.image_url, userId: user.id },
      });
      if (error) throw error;
      if (!data?.cutoutUrl) throw new Error('未返回抠图结果');
      const { error: upErr } = await supabase
        .from('clothing_items')
        .update({ cutout_url: data.cutoutUrl })
        .eq('id', cloth.id);
      if (upErr) throw upErr;
      setClothing((prev) =>
        prev.map((c) => (c.id === cloth.id ? { ...c, cutout_url: data.cutoutUrl } : c)),
      );
      toast.success('抠图完成，搭配更自然了');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '抠图失败');
    } finally {
      setCutoutLoadingId(null);
    }
  };

  // ==================== 搭配预览 ====================
  const addClothingToPreview = (c: ClothingItem) => {
    if (!selectedBody) {
      toast.error('请先选择一张人体照片');
      return;
    }
    if (overlays.some((o) => o.clothingId === c.id)) return;
    setOverlays((prev) => [
      ...prev,
      { clothingId: c.id, clothing: c, x: 50, y: 40 + prev.length * 8, scale: 1 },
    ]);
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.clothingId !== id));
  };

  const changeScale = (id: string, delta: number) => {
    setOverlays((prev) =>
      prev.map((o) => (o.clothingId === id ? { ...o, scale: clamp(o.scale + delta, 0.2, 3) } : o)),
    );
  };

  const onPointerDown = (e: React.PointerEvent, item: OverlayItem) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: item.clothingId, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const id = dragRef.current.id;
    const origX = dragRef.current.origX;
    const origY = dragRef.current.origY;
    setOverlays((prev) =>
      prev.map((o) =>
        o.clothingId === id ? { ...o, x: clamp(origX + dx, 0, 100), y: clamp(origY + dy, 0, 100) } : o,
      ),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const resetPreview = () => {
    setSelectedBody(null);
    setOverlays([]);
    setOutfitName('');
  };

  const saveOutfit = async () => {
    if (!user) return;
    if (!selectedBody) { toast.error('请先选择人体照片'); return; }
    if (overlays.length === 0) { toast.error('请至少叠加一件衣物'); return; }
    if (!outfitName.trim()) { toast.error('请给搭配起个名字'); return; }
    setSavingOutfit(true);
    try {
      const positions: Record<string, ClothingPos> = {};
      overlays.forEach((o) => { positions[o.clothingId] = { x: o.x, y: o.y, scale: o.scale }; });
      const { error } = await supabase
        .from('outfit_combinations')
        .insert({
          user_id: user.id,
          name: outfitName.trim(),
          body_photo_id: selectedBody.id,
          clothing_ids: overlays.map((o) => o.clothingId),
          positions,
        });
      if (error) throw error;
      toast.success('搭配已保存');
      setOutfitName('');
      setOverlays([]);
      setSelectedBody(null);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingOutfit(false);
    }
  };

  const deleteOutfit = async (id: string) => {
    if (!confirm('确定删除这个搭配？')) return;
    try {
      const { error } = await supabase.from('outfit_combinations').delete().eq('id', id);
      if (error) throw error;
      toast.success('已删除');
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 渲染一组叠加（预览 & 查看共用）
  const renderComposition = (
    body: BodyPhoto | null,
    clothMap: Map<string, ClothingItem>,
    positions: Record<string, ClothingPos> | undefined,
    ids: string[] | undefined,
    interactive: boolean,
  ) => {
    const items = (ids || []).map((cid) => {
      const c = clothMap.get(cid);
      const p = positions?.[cid] || { x: 50, y: 40, scale: 1 };
      return c ? { clothing: c, x: p.x, y: p.y, scale: p.scale } : null;
    }).filter(Boolean) as { clothing: ClothingItem; x: number; y: number; scale: number }[];

    return (
      <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        {body ? (
          <img src={body.image_url} alt="人体照片" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <User size={40} />
            <p className="text-xs mt-2">选择一张人体照片</p>
          </div>
        )}
        {items.map((it) => (
          <div
            key={it.clothing.id}
            className="absolute"
            style={{
              left: `${it.x}%`,
              top: `${it.y}%`,
              transform: `translate(-50%, -50%) scale($it.scale})`,
              touchAction: 'none',
            }}
          >
            <img
              src={it.clothing.cutout_url || it.clothing.image_url}
              alt={it.clothing.name}
              className="w-24 sm:w-28 max-h-40 object-contain pointer-events-none select-none"
              draggable={false}
            />
          </div>
        ))}
        {interactive && items.length === 0 && body && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <p className="text-xs">从下方选择衣物叠加</p>
          </div>
        )}
      </div>
    );
  };

  // ==================== 渲染 ====================
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'photos', label: '人体照片', icon: <Camera size={14} /> },
    { key: 'clothing', label: '衣物库', icon: <Shirt size={14} /> },
    { key: 'preview', label: '搭配预览', icon: <Layers size={14} /> },
    { key: 'outfits', label: '我的搭配', icon: <Eye size={14} /> },
  ];

  const clothMap = new Map(clothing.map((c) => [c.id, c]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <Shirt size={20} /> 衣服搭配
      </h1>

      {/* Tab 切换 */}
      <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              activeTab === t.key ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ============ 人体照片 ============ */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700">上传人体照片</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {ANGLES.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setPhotoAngle(a.key)}
                    className={`px-3 py-1.5 rounded-md text-sm transition ${
                      photoAngle === a.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer">
                <Upload size={16} />
                {uploadingPhoto ? '上传中...' : '选择照片'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>
            <p className="text-xs text-gray-400">支持正面 / 背面 / 侧面，建议纯色背景、全身清晰照</p>
          </div>

          {bodyPhotos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">还没有人体照片</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {bodyPhotos.map((p) => (
                <div key={p.id} className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <img src={p.image_url} alt={p.angle} className="w-full aspect-[3/4] object-cover" />
                  <span className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                    {ANGLES.find((a) => a.key === p.angle)?.label || p.angle}
                  </span>
                  <button
                    onClick={() => deletePhoto(p.id)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded hover:bg-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ 衣物库 ============ */}
      {activeTab === 'clothing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-700">添加衣物</h2>
            <input
              type="text" value={clothName} onChange={(e) => setClothName(e.target.value)}
              placeholder="衣物名称（如：红色卫衣）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={clothCategory} onChange={(e) => setClothCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={clothSeason} onChange={(e) => setClothSeason(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <input
              type="text" value={clothColor} onChange={(e) => setClothColor(e.target.value)}
              placeholder="颜色（选填，如：红色）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <label className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 cursor-pointer">
              <Upload size={16} />
              {uploadingCloth ? '上传中...' : '选择衣物图片并上传'}
              <input type="file" accept="image/*" className="hidden" onChange={handleClothUpload} disabled={uploadingCloth} />
            </label>
            {/* 抠图入口：上传衣物后可对单件衣物抠图 */}
            <p className="text-xs text-gray-400 pt-1">
              上传后可在下方「衣物库」中逐件点击「智能抠图」，生成透明图用于搭配叠加。
            </p>
          </div>

          {clothing.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">衣物库还是空的</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {clothing.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="relative">
                    {/* 透明棋盘格背景，便于预览抠图效果 */}
                    <div
                      className="w-full aspect-square bg-[length:16px_16px]"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)',
                        backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      <img
                        src={c.cutout_url || c.image_url}
                        alt={c.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => deleteCloth(c.id)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded hover:bg-red-500"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={() => handleCutout(c)}
                      disabled={cutoutLoadingId === c.id || !!c.cutout_url}
                      title={c.cutout_url ? '已抠图' : '智能抠图'}
                      className={`absolute top-1 left-1 p-1 rounded text-white ${
                        c.cutout_url
                          ? 'bg-green-500 cursor-default'
                          : 'bg-purple-500 hover:bg-purple-600 disabled:opacity-50'
                      }`}
                    >
                      {cutoutLoadingId === c.id ? (
                        <span className="block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                    </button>
                    {c.cutout_url && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">
                        已抠图
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{c.category}</span>
                      {c.color && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.color}</span>}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.season}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ 搭配预览 ============ */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* 选人体照片 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">① 选择底层人体照片</p>
            {bodyPhotos.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4">请先到「人体照片」上传照片</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {bodyPhotos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedBody(p); setOverlays([]); }}
                    className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedBody?.id === p.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={p.image_url} alt={p.angle} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 预览画布 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">② 拖动衣物调整位置，滚轮/按钮缩放</p>
            <div
              ref={previewRef}
              className="relative w-full max-w-sm mx-auto touch-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {renderComposition(selectedBody, clothMap, undefined, undefined, true)}
              {overlays.map((o) => (
                <div
                  key={o.clothingId}
                  onPointerDown={(e) => onPointerDown(e, o)}
                  className="absolute cursor-move"
                  style={{
                    left: `${o.x}%`,
                    top: `${o.y}%`,
                    transform: `translate(-50%, -50%) scale(${o.scale})`,
                    touchAction: 'none',
                    zIndex: 10,
                  }}
                >
                  <img
                    src={o.clothing.cutout_url || o.clothing.image_url}
                    alt={o.clothing.name}
                    className="w-24 sm:w-28 max-h-40 object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                  {/* 操作条 */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow px-1.5 py-1 border border-gray-200">
                    <button onClick={() => changeScale(o.clothingId, 0.1)} className="p-0.5 text-gray-600 hover:text-blue-500">
                      <ZoomIn size={14} />
                    </button>
                    <button onClick={() => changeScale(o.clothingId, -0.1)} className="p-0.5 text-gray-600 hover:text-blue-500">
                      <ZoomOut size={14} />
                    </button>
                    <button onClick={() => removeOverlay(o.clothingId)} className="p-0.5 text-gray-400 hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 衣物选择 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">③ 点击衣物叠加到画布</p>
            {clothing.length === 0 ? (
              <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4">请先到「衣物库」添加衣物</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {clothing.map((c) => {
                  const added = overlays.some((o) => o.clothingId === c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => addClothingToPreview(c)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                        added ? 'border-green-500 opacity-60' : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <img src={c.cutout_url || c.image_url} alt={c.name} className="w-full h-full object-cover" />
                      {added && <span className="absolute inset-0 flex items-center justify-center bg-green-500/20 text-green-700 text-xs">已加</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 保存 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <input
              type="text" value={outfitName} onChange={(e) => setOutfitName(e.target.value)}
              placeholder="给这套搭配起个名字"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={saveOutfit}
                disabled={savingOutfit}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Save size={16} /> {savingOutfit ? '保存中...' : '保存搭配'}
              </button>
              <button
                onClick={resetPreview}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
              >
                <RotateCcw size={16} /> 清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 我的搭配 ============ */}
      {activeTab === 'outfits' && (
        <div className="space-y-3">
          {outfits.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">还没有保存的搭配</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {outfits.map((o) => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="relative cursor-pointer" onClick={() => setViewOutfit(o)}>
                    {renderComposition(
                      bodyPhotos.find((b) => b.id === o.body_photo_id) || null,
                      clothMap,
                      o.positions as Record<string, ClothingPos> | undefined,
                      o.clothing_ids,
                      false,
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition">
                      <span className="text-white text-sm flex items-center gap-1"><Eye size={14} /> 查看</span>
                    </div>
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{o.name}</span>
                    <button onClick={() => deleteOutfit(o.id)} className="text-gray-300 hover:text-red-500 ml-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 查看搭配弹窗 */}
      {viewOutfit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setViewOutfit(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold">{viewOutfit.name}</h3>
              <button onClick={() => setViewOutfit(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <div className="max-w-xs mx-auto">
                {renderComposition(
                  bodyPhotos.find((b) => b.id === viewOutfit.body_photo_id) || null,
                  clothMap,
                  viewOutfit.positions as Record<string, ClothingPos> | undefined,
                  viewOutfit.clothing_ids,
                  false,
                )}
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                共 {viewOutfit.clothing_ids.length} 件衣物
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

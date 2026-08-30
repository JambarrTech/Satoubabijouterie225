import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../../lib/apiClient';

export function GerantProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [compareAtPrice, setCompareAtPrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [material, setMaterial] = useState('');
  const [collection, setCollection] = useState('');
  const [carats, setCarats] = useState('');
  const [weightGrams, setWeightGrams] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isPromo, setIsPromo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = () => {
    apiGet<any>('/api/products?includeAll=true')
      .then(res => {
        setProducts(Array.isArray(res) ? res : res.data || []);
      })
      .catch(err => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchProducts();
    apiGet('/api/categories').then(data => setCategories(data as any[])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setPrice(0);
    setCompareAtPrice(0);
    setStockQuantity(0);
    setMaterial('');
    setCollection('');
    setCarats('');
    setWeightGrams(0);
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setDescription('');
    setImages([]);
    setIsBestSeller(false);
    setIsNew(false);
    setIsPromo(false);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setCompareAtPrice(prod.compareAtPrice || 0);
    setStockQuantity(prod.stockQuantity || 0);
    setMaterial(prod.material || '');
    setCollection(prod.collection || '');
    setCarats(prod.carats || '');
    setWeightGrams(prod.weightGrams || 0);
    setCategoryId(prod.categoryId || '');
    setDescription(prod.description || '');
    setImages(prod.images || []);
    setIsBestSeller(prod.isBestSeller || false);
    setIsNew(prod.isNew || false);
    setIsPromo(prod.isPromo || false);
    setError('');
    setIsModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const newImages: string[] = [];
      const fileArray = Array.from(files) as File[];
      for (const file of fileArray) {
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} dépasse la limite de 5 Mo.`);
          continue;
        }
        const result = await apiUpload(file);
        newImages.push(result.url);
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (images.length === 0) {
      setError('Veuillez ajouter au moins une image.');
      return;
    }
    const payload = {
      name,
      price: Number(price),
      compareAtPrice: Number(compareAtPrice) || null,
      stockQuantity: Number(stockQuantity),
      material,
      collection,
      carats: carats || null,
      weightGrams: Number(weightGrams) || null,
      categoryId,
      description,
      images,
      slug: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isBestSeller,
      isNew,
      isPromo,
    };

    try {
      if (editingProduct) {
        await apiPut(`/api/products/${editingProduct.id}`, payload);
      } else {
        await apiPost('/api/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article du catalogue ?")) {
      await apiDelete(`/api/products/${id}`);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Gestion des Articles & Catalogue</h2>
          <p className="text-sm text-gray-500">Ajoutez, modifiez ou supprimez les bijoux exposés sur la boutique.</p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus size={18} />}>
          Ajouter un bijou
        </Button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Rechercher un bijou par nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Bijou</th>
                <th className="p-4 font-semibold">Collection</th>
                <th className="p-4 font-semibold">Prix</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map(prod => (
                <tr key={prod.id} className={`hover:bg-gray-50/50 ${!prod.inStock ? 'opacity-60' : ''}`}>
                  <td className="p-4 flex items-center gap-3">
                    <img src={prod.images?.[0] || '/placeholder.svg'} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Réf: {prod.id}</span>
                        {prod.isBestSeller && <span className="text-[10px] font-bold text-[#D9A441] bg-amber-50 px-1.5 py-0.5 rounded">BEST</span>}
                        {prod.isNew && <span className="text-[10px] font-bold text-[#0B5D1E] bg-emerald-50 px-1.5 py-0.5 rounded">NEW</span>}
                        {prod.isPromo && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">PROMO</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 text-xs">{prod.collection || '-'}</td>
                  <td className="p-4">
                    <p className="font-bold text-[#0B5D1E]">{Number(prod.price).toLocaleString('fr-FR')} FCFA</p>
                    {prod.compareAtPrice && <p className="text-xs text-gray-400 line-through">{Number(prod.compareAtPrice).toLocaleString('fr-FR')} FCFA</p>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      !prod.inStock ? 'bg-gray-100 text-gray-500' :
                      (prod.stockQuantity || 0) > 3 ? 'bg-[#EAF7ED] text-[#0B5D1E]' : 'bg-red-50 text-red-600'
                    }`}>
                      {!prod.inStock ? 'Indisponible' : `${prod.stockQuantity} en stock`}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleOpenEdit(prod)} className="p-2 text-gray-500 hover:text-[#0B5D1E] bg-gray-100 hover:bg-[#EAF7ED] rounded-xl transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(prod.id)} className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Modifier le bijou" : "Ajouter un nouveau bijou"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
          <Input label="Nom du bijou" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prix (FCFA)" type="number" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} required />
            <Input label="Prix barré (FCFA)" type="number" value={compareAtPrice || ''} onChange={(e) => setCompareAtPrice(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantité en stock" type="number" value={stockQuantity || ''} onChange={(e) => setStockQuantity(Number(e.target.value))} required />
            <Input label="Poids (grammes)" type="number" value={weightGrams || ''} onChange={(e) => setWeightGrams(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Matière (ex: Or Jaune 18K)" value={material} onChange={(e) => setMaterial(e.target.value)} />
            <Input label="Collection" value={collection} onChange={(e) => setCollection(e.target.value)} />
          </div>
          <Input label="Carats (ex: 0.75 ct)" value={carats} onChange={(e) => setCarats(e.target.value)} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Catégorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              required
            >
              <option value="">Choisir une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isBestSeller} onChange={e => setIsBestSeller(e.target.checked)} className="rounded border-gray-300" />
              Best-seller
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} className="rounded border-gray-300" />
              Nouveauté
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPromo} onChange={e => setIsPromo(e.target.checked)} className="rounded border-gray-300" />
              Promo
            </label>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Images du produit</label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={img || '/placeholder.svg'} alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0B5D1E] flex flex-col items-center justify-center text-gray-400 hover:text-[#0B5D1E] transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-[#0B5D1E] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={20} />
                    <span className="text-[10px] mt-1">Ajouter</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG ou WebP — max 5 Mo par image</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#0B5D1E]"
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit">{editingProduct ? "Mettre à jour" : "Créer l'article"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

// Адаптивные стили для мобильных
const mobileStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  
  .admin-header-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
  .admin-header-btn { padding: 6px 10px !important; font-size: 12px !important; }
  
  @media (max-width: 768px) {
    .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .admin-order-detail-grid { grid-template-columns: 1fr !important; }
    .admin-form-grid { grid-template-columns: 1fr !important; }
    .admin-promo-grid { grid-template-columns: 1fr !important; }
    .admin-header { height: auto !important; padding: 10px 12px !important; flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
    .admin-header-nav { width: 100%; overflow-x: auto; padding-bottom: 4px; }
    .admin-header-nav::-webkit-scrollbar { height: 2px; }
    .admin-header-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.3); }
    .admin-content { padding: 12px 8px !important; }
    .admin-login-box { width: 90% !important; padding: 28px 20px !important; }
    .admin-order-card-header { flex-wrap: wrap !important; gap: 8px !important; }
    .admin-modal-box { padding: 16px !important; }
  }
  
  @media (max-width: 480px) {
    .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .admin-header-btn { padding: 5px 8px !important; font-size: 11px !important; }
  }
`

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bellissimo2025'
const DEFAULT_CATEGORIES = ['Комплекты','Бюстгальтеры','Корсеты','Пижамы','Боди','Ночные сорочки','Халаты','Трусики','Чулки','Пояса для чулок','Купальники']
const BUCKET = 'product'

const STATUS_LABELS = {
  pending:   { label: '⏳ Ожидает оплаты', color: '#856404', bg: '#fff3cd', border: '#ffc107' },
  paid:      { label: '✅ Оплачен',         color: '#155724', bg: '#d4edda', border: '#28a745' },
  shipped:   { label: '🚚 Отправлен',       color: '#0c5460', bg: '#d1ecf1', border: '#17a2b8' },
  completed: { label: '🎉 Выполнен',        color: '#3a7a3a', bg: '#edf7ed', border: '#86efac' },
  canceled:  { label: '❌ Отменён',         color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' },
}

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('orders')
  const [editProduct, setEditProduct] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Все')
  const [dragIdx, setDragIdx] = useState(null)
  const [settings, setSettings] = useState({ 
    hero_title: '', hero_subtitle: '', hero_image: '', free_delivery_amount: 10000,
    delivery_cdek: 'Почта РФ стандарт · 590 ₽ · 5–14 дней',
    delivery_post: 'Срочная доставка · 1 100 ₽ · 2–5 дней',
    delivery_courier: 'Самовывоз в Калининграде · Бесплатно',
    return_policy: 'Нижнее бельё не подлежит обмену и возврату по санитарным нормам'
  })
  const [settingsLoading, setSL] = useState(false)
  const [promos, setPromos] = useState([])
  const [promosLoading, setPromosLoading] = useState(false)
  const [featuredIds, setFeaturedIds] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const [newPromo, setNewPromo] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order: '', starts_at: '', expires_at: '', max_uses: '', categories: [] })
  const [allCategories, setAllCategories] = useState(DEFAULT_CATEGORIES)
  const [newCatName, setNewCatName] = useState('')

  // Заказы
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)

  const emptyForm = {
    name: '', category: 'Комплекты', price: '', old_price: '',
    description: '', sizes: '', sizeStock: {}, is_new: false, active: true,
    images: [], video_url: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (auth) { loadProducts(); loadSettings(); loadPromos(); loadFeatured(); loadCategories(); loadOrders() } }, [auth])

  async function loadOrders() {
    setOrdersLoading(true)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) showMsg('Ошибка загрузки заказов: ' + error.message, 'error')
    setOrders(data || [])
    setOrdersLoading(false)
  }

  async function updateOrderStatus(id, status) {
    setStatusUpdating(id)
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      showMsg('✅ Статус обновлён!')
    } else {
      showMsg('❌ Ошибка: ' + error.message, 'error')
    }
    setStatusUpdating(null)
  }

  async function deleteOrder(id) {
    if (!confirm('Удалить заказ? Это нельзя отменить.')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== id))
      showMsg('🗑 Заказ удалён')
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text)
    showMsg('📋 Скопировано!')
  }

  const filteredOrders = orders.filter(o => {
    const matchStatus = orderStatus === 'all' || o.status === orderStatus
    const q = orderSearch.toLowerCase()
    const matchSearch = !q ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.customer_address?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const orderStats = {
    total: orders.length,
    paid: orders.filter(o => o.status === 'paid').length,
    pending: orders.filter(o => o.status === 'pending').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
    canceled: orders.filter(o => o.status === 'canceled').length,
    revenue: orders.filter(o => ['paid','shipped','completed'].includes(o.status)).reduce((s,o) => s + (o.total_amount || 0), 0)
  }

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) showMsg('Ошибка загрузки: ' + error.message, 'error')
    setProducts(data || [])
    setLoading(false)
  }

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (data) setSettings(data)
    } catch {}
  }

  async function loadCategories() {
    try {
      const { data } = await supabase.from('settings').select('custom_categories').eq('id', 1).single()
      if (data?.custom_categories && data.custom_categories.length > 0) {
        setAllCategories(data.custom_categories)
      } else {
        await supabase.from('settings').upsert({ id: 1, custom_categories: DEFAULT_CATEGORIES })
        setAllCategories(DEFAULT_CATEGORIES)
      }
    } catch {}
  }

  async function saveCategories(cats) {
    await supabase.from('settings').upsert({ id: 1, custom_categories: cats })
    setAllCategories(cats)
  }

  function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    if (allCategories.includes(name)) { showMsg('❌ Такая категория уже есть', 'error'); return }
    saveCategories([...allCategories, name])
    setNewCatName('')
    showMsg('✅ Категория добавлена!')
  }

  function removeCategory(cat) {
    const count = products.filter(p => p.category === cat).length
    const msg = count > 0 ? `Удалить «${cat}»? В ней ${count} товаров.` : `Удалить категорию «${cat}»?`
    if (!confirm(msg)) return
    saveCategories(allCategories.filter(c => c !== cat))
    showMsg('🗑 Категория удалена')
  }

  async function loadFeatured() {
    setFeaturedLoading(true)
    try {
      const { data } = await supabase.from('settings').select('featured_ids').eq('id', 1).single()
      setFeaturedIds(data?.featured_ids || [])
    } catch {}
    setFeaturedLoading(false)
  }

  async function saveFeatured(ids) {
    await supabase.from('settings').upsert({ id: 1, featured_ids: ids })
    setFeaturedIds(ids)
    showMsg('✅ Новинки сохранены!')
  }

  function toggleFeatured(id) {
    const newIds = featuredIds.includes(id) ? featuredIds.filter(x => x !== id) : [...featuredIds, id]
    saveFeatured(newIds)
  }

  async function loadPromos() {
    setPromosLoading(true)
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    setPromos(data || [])
    setPromosLoading(false)
  }

  async function createPromo() {
    if (!newPromo.code.trim()) return showMsg('❌ Введите код промокода', 'error')
    if (!newPromo.discount_value) return showMsg('❌ Введите размер скидки', 'error')
    const payload = {
      code: newPromo.code.trim().toUpperCase(),
      discount_type: newPromo.discount_type,
      discount_value: Number(newPromo.discount_value),
      min_order: newPromo.min_order ? Number(newPromo.min_order) : 0,
      starts_at: newPromo.starts_at || null,
      expires_at: newPromo.expires_at || null,
      max_uses: newPromo.max_uses ? Number(newPromo.max_uses) : 0,
      categories: newPromo.categories || [],
      active: true, used_count: 0
    }
    const { error } = await supabase.from('promo_codes').insert([payload])
    if (error) return showMsg('❌ Ошибка: ' + error.message, 'error')
    showMsg('✅ Промокод создан!')
    setNewPromo({ code: '', discount_type: 'percent', discount_value: '', min_order: '', expires_at: '', active: true })
    loadPromos()
  }

  async function togglePromo(id, active) {
    await supabase.from('promo_codes').update({ active: !active }).eq('id', id)
    loadPromos()
  }

  async function deletePromo(id) {
    if (!confirm('Удалить промокод?')) return
    await supabase.from('promo_codes').delete().eq('id', id)
    loadPromos()
    showMsg('🗑 Промокод удалён')
  }

  async function saveSettings() {
    setSL(true)
    const { error } = await supabase.from('settings').upsert({ id: 1, ...settings })
    setSL(false)
    if (error) showMsg('Ошибка: ' + error.message, 'error')
    else showMsg('✅ Настройки сохранены!')
  }

  async function uploadFile(file, folder) {
    // Конвертируем файл в base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsDataURL(file)
    })

    // Отправляем на сервер → Cloudinary
    const res = await fetch('/api/cloudinary-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64, folder })
    })

    const data = await res.json()
    if (!data.url) throw new Error(data.error || 'Ошибка загрузки файла')
    return data.url
  }

  async function handlePhotoUpload(files) {
    const arr = Array.from(files).slice(0, 5 - form.images.length)
    if (!arr.length) return
    setUploading(true)
    for (const file of arr) {
      try {
        const url = await uploadFile(file, 'images')
        setForm(f => {
          const imgs = [...f.images, { url, isMain: false }]
          if (!imgs.some(i => i.isMain)) imgs[0].isMain = true
          return { ...f, images: imgs }
        })
      } catch (e) { showMsg('❌ Ошибка загрузки фото: ' + e.message, 'error') }
    }
    setUploading(false)
  }

  async function handleVideoUpload(file) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'videos')
      setForm(f => ({ ...f, video_url: url }))
      showMsg('✅ Видео загружено!')
    } catch (e) { showMsg('❌ Ошибка видео: ' + e.message, 'error') }
    setUploading(false)
  }

  async function handleHeroUpload(file) {
    if (!file) return
    setSL(true)
    try {
      const url = await uploadFile(file, 'hero')
      setSettings(s => ({ ...s, hero_image: url }))
      showMsg('✅ Главное фото загружено!')
    } catch (e) { showMsg('❌ ' + e.message, 'error') }
    setSL(false)
  }

  function removeImage(idx) {
    setForm(f => {
      const imgs = f.images.filter((_, i) => i !== idx)
      if (imgs.length && !imgs.some(i => i.isMain)) imgs[0].isMain = true
      return { ...f, images: imgs }
    })
  }

  function setMainImage(idx) {
    setForm(f => ({ ...f, images: f.images.map((img, i) => ({ ...img, isMain: i === idx })) }))
  }

  function handleDragStart(idx) { setDragIdx(idx) }
  function handleDropImg(e, idx) {
    e.preventDefault()
    if (dragIdx === null) return
    setForm(f => {
      const imgs = [...f.images]
      const [moved] = imgs.splice(dragIdx, 1)
      imgs.splice(idx, 0, moved)
      return { ...f, images: imgs }
    })
    setDragIdx(null)
  }

  function updateSizeStock(size, value) {
    setForm(f => ({ ...f, sizeStock: { ...f.sizeStock, [size]: value } }))
  }

  async function saveProduct() {
    if (!form.name.trim()) return showMsg('❌ Введите название товара', 'error')
    if (!form.price) return showMsg('❌ Введите цену', 'error')
    const sorted = [...form.images].sort((a, b) => b.isMain - a.isMain)
    const parsedSizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean)
    const payload = {
      name: form.name.trim(), category: form.category,
      price: Number(form.price), old_price: form.old_price ? Number(form.old_price) : null,
      description: form.description.trim(), sizes: parsedSizes,
      size_stock: form.sizeStock || {}, images: sorted.map(i => i.url),
      video_url: form.video_url || null, is_new: form.is_new, active: form.active,
    }
    setLoading(true)
    try {
      let result
      if (editProduct) result = await supabase.from('products').update(payload).eq('id', editProduct.id)
      else result = await supabase.from('products').insert([payload])
      if (result.error) throw new Error(result.error.message)
      showMsg(editProduct ? '✅ Товар обновлён!' : '✅ Товар добавлен!')
      resetForm()
      await loadProducts()
      setTab('list')
    } catch (e) { showMsg('❌ Ошибка: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  async function toggleActive(p) {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    if (!error) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(prev => prev.filter(x => x.id !== id))
    showMsg('🗑 Удалено')
  }

  async function duplicateProduct(p) {
    const { id, created_at, ...rest } = p
    const { error } = await supabase.from('products').insert([{ ...rest, name: rest.name + ' (копия)', active: false }])
    if (!error) { await loadProducts(); showMsg('✅ Продублировано') }
  }

  function startEdit(p) {
    setEditProduct(p)
    const sizes = p.sizes || []
    const sizeStock = p.size_stock || {}
    setForm({
      name: p.name || '', category: p.category || 'Комплекты',
      price: p.price ? String(p.price) : '', old_price: p.old_price ? String(p.old_price) : '',
      description: p.description || '', sizes: sizes.join(', '), sizeStock,
      is_new: p.is_new || false, active: p.active !== false,
      images: (p.images || []).map((url, i) => ({ url, isMain: i === 0 })),
      video_url: p.video_url || ''
    })
    setTab('add')
    window.scrollTo(0, 0)
  }

  function resetForm() { setEditProduct(null); setForm(emptyForm) }

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 5000)
  }

  const filtered = products.filter(p =>
    (filterCat === 'Все' || p.category === filterCat) &&
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const parsedSizesForStock = form.sizes.split(',').map(s => s.trim()).filter(Boolean)

  if (!auth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', fontFamily:'sans-serif' }}>
      <div className="admin-login-box" style={{ background:'#fff', padding:48, borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.3)', textAlign:'center', width:360, maxWidth:'92vw' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🌹</div>
        <h2 style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontWeight:300, marginBottom:4, color:'#3a2f2b', fontSize:28 }}>Bellissimo</h2>
        <p style={{ color:'#9e8e85', fontSize:13, marginBottom:32, letterSpacing:2, textTransform:'uppercase' }}>Панель управления</p>
        {msg.text && <div style={{ background:'#fef2f2', color:'#c45c5c', padding:10, borderRadius:8, marginBottom:16, fontSize:13 }}>{msg.text}</div>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Введите пароль"
          onKeyDown={e => e.key === 'Enter' && (password === ADMIN_PASSWORD ? setAuth(true) : showMsg('❌ Неверный пароль','error'))}
          style={{ width:'100%', padding:'14px 16px', border:'2px solid #ede4dc', borderRadius:10, fontSize:15, marginBottom:16, outline:'none', boxSizing:'border-box', textAlign:'center', letterSpacing:4 }} />
        <button onClick={() => password === ADMIN_PASSWORD ? setAuth(true) : showMsg('❌ Неверный пароль','error')}
          style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:600 }}>
          Войти
        </button>
      </div>
    </div>
  )

  const IS = { width:'100%', padding:'10px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none', fontFamily:'sans-serif', background:'#fff', color:'#3a2f2b', boxSizing:'border-box' }

  return (
    <>
      <Head><title>Bellissimo Admin</title><style>{mobileStyles}</style></Head>
      <div style={{ minHeight:'100vh', background:'#f8f4f1', fontFamily:"'Nunito Sans',sans-serif" }}>

        {/* Шапка */}
        <div className="admin-header" style={{ background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', color:'#fff', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:58, position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 16px rgba(0,0,0,.2)', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontFamily:'Georgia,serif', fontSize:18 }}>
            <span style={{ color:'#f0c8d2', fontStyle:'italic' }}>Bellissimo</span>
            <span style={{ opacity:.5, margin:'0 8px' }}>|</span>
            <span style={{ fontSize:12, opacity:.7 }}>Admin</span>
          </div>
          <div className="admin-header-nav" style={{ display:'flex', gap:6, flexWrap:'nowrap', overflowX:'auto' }}>
            {[
              ['orders','📦 Заказы', orders.filter(o=>o.status==='paid').length > 0 ? orders.filter(o=>o.status==='paid').length : undefined],
              ['list','📋 Товары', products.length],
              ['add','➕ Добавить'],
              ['featured','✨ Новинки'],
              ['promo','🏷️ Промокоды'],
              ['cats','📂 Категории'],
              ['settings','⚙️ Настройки']
            ].map(([id,label,count]) => (
              <button key={id} onClick={() => { setTab(id); if(id !== 'add') resetForm() }}
                style={{ padding:'6px 14px', background:tab===id?'#c9748a':'rgba(255,255,255,.12)', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:tab===id?600:400, position:'relative' }}>
                {label}
                {count !== undefined && <span style={{ marginLeft:4, background: id==='orders'?'#ff4757':'rgba(255,255,255,.3)', borderRadius:10, padding:'1px 6px', fontSize:11, fontWeight:700 }}>{count}</span>}
              </button>
            ))}
            <a href="/" target="_blank" style={{ padding:'6px 14px', background:'rgba(255,255,255,.12)', color:'#fff', borderRadius:7, fontSize:13, textDecoration:'none' }}>🌐 Сайт ↗</a>
          </div>
        </div>

        {msg.text && (
          <div style={{ background:msg.type==='error'?'#fef2f2':'#edf7ed', color:msg.type==='error'?'#c45c5c':'#3a7a3a', padding:'10px 24px', textAlign:'center', fontWeight:600, fontSize:13, borderBottom:`2px solid ${msg.type==='error'?'#fca5a5':'#86efac'}` }}>
            {msg.text}
          </div>
        )}

        <div className="admin-content" style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px' }}>

          {/* ── ЗАКАЗЫ ── */}
          {tab === 'orders' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, color:'#3a2f2b', fontSize:26, margin:0 }}>📦 Заказы</h2>
                <button onClick={loadOrders} style={{ padding:'8px 16px', background:'#fff', border:'1.5px solid #ede4dc', borderRadius:8, cursor:'pointer', fontSize:13, color:'#3a2f2b' }}>
                  🔄 Обновить
                </button>
              </div>

              {/* Статистика */}
              <div className="admin-stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
                {[
                  ['Всего заказов', orderStats.total, '📦', '#7c6d9a'],
                  ['Оплачено', orderStats.paid, '✅', '#3a7a3a'],
                  ['Ожидают', orderStats.pending, '⏳', '#856404'],
                  ['Отправлено', orderStats.shipped, '🚚', '#0c5460'],
                  ['Выполнено', orderStats.completed, '🎉', '#c9748a'],
                  ['Отменено', orderStats.canceled, '❌', '#c45c5c'],
                ].map(([label,val,icon,color],i) => (
                  <div key={i} style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>{icon}</span>
                    <div><div style={{ fontSize:20, fontWeight:700, color }}>{val}</div><div style={{ fontSize:11, color:'#9e8e85' }}>{label}</div></div>
                  </div>
                ))}
                <div style={{ background:'linear-gradient(135deg,#c9748a,#a55570)', border:'none', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:10, color:'#fff' }}>
                  <span style={{ fontSize:22 }}>💰</span>
                  <div><div style={{ fontSize:18, fontWeight:700 }}>{orderStats.revenue.toLocaleString('ru')} ₽</div><div style={{ fontSize:11, opacity:.8 }}>Выручка</div></div>
                </div>
              </div>

              {/* Поиск и фильтр */}
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Поиск по имени, телефону, адресу..."
                  style={{ flex:1, minWidth:200, padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none' }} />
                <select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)}
                  style={{ padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none', background:'#fff', cursor:'pointer' }}>
                  <option value="all">Все статусы</option>
                  <option value="pending">⏳ Ожидает оплаты</option>
                  <option value="paid">✅ Оплачен</option>
                  <option value="shipped">🚚 Отправлен</option>
                  <option value="completed">🎉 Выполнен</option>
                  <option value="canceled">❌ Отменён</option>
                </select>
                <span style={{ fontSize:12, color:'#9e8e85', whiteSpace:'nowrap' }}>Найдено: {filteredOrders.length}</span>
              </div>

              {ordersLoading ? (
                <div style={{ textAlign:'center', padding:48, color:'#9e8e85' }}>⏳ Загрузка заказов...</div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 20px', color:'#9e8e85' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📦</div>
                  <p>Заказов пока нет</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {filteredOrders.map(order => {
                    const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending
                    const isExpanded = expandedOrder === order.id
                    const items = Array.isArray(order.items) ? order.items : []
                    const date = new Date(order.created_at).toLocaleString('ru', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })

                    return (
                      <div key={order.id} style={{ background:'#fff', border:`1.5px solid ${st.border}`, borderRadius:14, overflow:'hidden', transition:'all .2s' }}>
                        
                        {/* Шапка заказа */}
                        <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', cursor:'pointer' }}
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                          
                          {/* Номер и дата */}
                          <div style={{ minWidth:120 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'#3a2f2b', fontFamily:'monospace' }}>
                              #{order.id.slice(0,8).toUpperCase()}
                            </div>
                            <div style={{ fontSize:11, color:'#9e8e85', marginTop:2 }}>{date}</div>
                          </div>

                          {/* Покупатель */}
                          <div style={{ flex:1, minWidth:150 }}>
                            <div style={{ fontSize:14, fontWeight:600, color:'#3a2f2b' }}>{order.customer_name || '—'}</div>
                            <div style={{ fontSize:12, color:'#9e8e85' }}>{order.customer_phone}</div>
                          </div>

                          {/* Товары краткo */}
                          <div style={{ flex:2, minWidth:180 }}>
                            <div style={{ fontSize:12, color:'#9e8e85' }}>
                              {items.map((x,i) => (
                                <span key={i}>{x.name}{x.size?` (${x.size})`:''} ×{x.qty}{i<items.length-1?', ':''}</span>
                              ))}
                            </div>
                          </div>

                          {/* Сумма */}
                          <div style={{ textAlign:'right', minWidth:90 }}>
                            <div style={{ fontSize:16, fontWeight:700, color:'#c9748a' }}>{order.total_amount?.toLocaleString('ru')} ₽</div>
                            {order.discount_amount > 0 && <div style={{ fontSize:11, color:'#3a7a3a' }}>скидка -{order.discount_amount?.toLocaleString('ru')} ₽</div>}
                          </div>

                          {/* Статус */}
                          <div style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, background:st.bg, color:st.color, border:`1px solid ${st.border}`, whiteSpace:'nowrap' }}>
                            {st.label}
                          </div>

                          {/* Стрелка */}
                          <div style={{ fontSize:18, color:'#9e8e85', transform:isExpanded?'rotate(180deg)':'rotate(0deg)', transition:'transform .2s' }}>▾</div>
                        </div>

                        {/* Раскрытая часть */}
                        {isExpanded && (
                          <div style={{ borderTop:'1px solid #f0e8e0', padding:'20px', background:'#faf8f6' }}>
                            <div className="admin-order-detail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                              
                              {/* Данные покупателя */}
                              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #ede4dc' }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'#9e8e85', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>👤 Покупатель</div>
                                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <div>
                                      <div style={{ fontSize:11, color:'#9e8e85' }}>Имя</div>
                                      <div style={{ fontSize:14, fontWeight:600 }}>{order.customer_name}</div>
                                    </div>
                                  </div>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <div>
                                      <div style={{ fontSize:11, color:'#9e8e85' }}>Телефон</div>
                                      <div style={{ fontSize:14, fontWeight:600 }}>{order.customer_phone}</div>
                                    </div>
                                    <button onClick={() => copyText(order.customer_phone)}
                                      style={{ padding:'4px 10px', background:'#f0f0f0', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 }}>📋</button>
                                  </div>
                                  {order.customer_email && (
                                    <div>
                                      <div style={{ fontSize:11, color:'#9e8e85' }}>Email</div>
                                      <div style={{ fontSize:14 }}>{order.customer_email}</div>
                                    </div>
                                  )}
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:11, color:'#9e8e85' }}>Адрес доставки</div>
                                      <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4 }}>{order.customer_address}</div>
                                    </div>
                                    <button onClick={() => copyText(order.customer_address)}
                                      style={{ padding:'4px 10px', background:'#f0f0f0', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, marginLeft:8, flexShrink:0 }}>📋</button>
                                  </div>
                                  {order.comment && (
                                    <div style={{ padding:'10px 12px', background:'#fff8f0', borderRadius:8, border:'1px solid #ede4dc' }}>
                                      <div style={{ fontSize:11, color:'#9e8e85', marginBottom:4 }}>💬 Комментарий покупателя</div>
                                      <div style={{ fontSize:14, color:'#3a2f2b', fontStyle:'italic' }}>«{order.comment}»</div>
                                    </div>
                                  )}
                                </div>

                                {/* Быстрые действия */}
                                <div style={{ marginTop:14, display:'flex', gap:8, flexWrap:'wrap' }}>
                                  <a href={`https://wa.me/${order.customer_phone?.replace(/\D/g,'').replace(/^8/,'7')}`}
                                    target="_blank" rel="noreferrer"
                                    style={{ padding:'7px 14px', background:'#25d366', color:'#fff', borderRadius:8, textDecoration:'none', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                                    💬 WhatsApp
                                  </a>
                                  <a href={`tel:${order.customer_phone}`}
                                    style={{ padding:'7px 14px', background:'#faf3ed', border:'1px solid #ede4dc', color:'#3a2f2b', borderRadius:8, textDecoration:'none', fontSize:12, fontWeight:600 }}>
                                    📞 Позвонить
                                  </a>
                                </div>
                              </div>

                              {/* Товары */}
                              <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #ede4dc' }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'#9e8e85', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>🛍️ Товары</div>
                                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                  {items.map((item, i) => (
                                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#faf8f6', borderRadius:8 }}>
                                      <div>
                                        <div style={{ fontSize:13, fontWeight:600, color:'#3a2f2b' }}>{item.name}</div>
                                        <div style={{ fontSize:11, color:'#9e8e85', marginTop:2 }}>
                                          {item.category}
                                          {item.size && <span style={{ marginLeft:6, padding:'1px 6px', background:'#f0e8e0', borderRadius:4, fontWeight:700 }}>{item.size}</span>}
                                          <span style={{ marginLeft:6 }}>× {item.qty} шт</span>
                                        </div>
                                      </div>
                                      <div style={{ fontSize:14, fontWeight:700, color:'#c9748a', whiteSpace:'nowrap' }}>
                                        {(item.price * item.qty).toLocaleString('ru')} ₽
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* Итого */}
                                <div style={{ marginTop:12, padding:'10px 12px', background:'#fdf3f5', borderRadius:8, border:'1px solid #f0c8d2' }}>
                                  {order.discount_amount > 0 && (
                                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#3a7a3a', marginBottom:4 }}>
                                      <span>Скидка {order.promo_code && `(${order.promo_code})`}:</span>
                                      <span>−{order.discount_amount?.toLocaleString('ru')} ₽</span>
                                    </div>
                                  )}
                                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:700, color:'#3a2f2b' }}>
                                    <span>Итого к оплате:</span>
                                    <span style={{ color:'#c9748a' }}>{order.total_amount?.toLocaleString('ru')} ₽</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Управление статусом */}
                            <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #ede4dc' }}>
                              <div style={{ fontSize:12, fontWeight:700, color:'#9e8e85', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>🔄 Изменить статус заказа</div>
                              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                  <button key={key}
                                    onClick={() => updateOrderStatus(order.id, key)}
                                    disabled={order.status === key || statusUpdating === order.id}
                                    style={{
                                      padding:'8px 16px', borderRadius:8, cursor: order.status === key ? 'default' : 'pointer',
                                      fontSize:13, fontWeight:600, border:`1.5px solid ${val.border}`,
                                      background: order.status === key ? val.bg : '#fff',
                                      color: order.status === key ? val.color : '#9e8e85',
                                      opacity: statusUpdating === order.id ? .6 : 1
                                    }}>
                                    {val.label}
                                  </button>
                                ))}
                              </div>

                              {/* payment_id если есть */}
                              {order.payment_id && (
                                <div style={{ marginTop:12, fontSize:12, color:'#9e8e85', display:'flex', alignItems:'center', gap:8 }}>
                                  <span>ID платежа ЮКассы:</span>
                                  <span style={{ fontFamily:'monospace', color:'#3a2f2b' }}>{order.payment_id}</span>
                                  <button onClick={() => copyText(order.payment_id)}
                                    style={{ padding:'2px 8px', background:'#f0f0f0', border:'none', borderRadius:4, cursor:'pointer', fontSize:11 }}>📋</button>
                                </div>
                              )}
                            </div>

                            {/* Удаление */}
                            <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
                              <button onClick={() => deleteOrder(order.id)}
                                style={{ padding:'7px 16px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, cursor:'pointer', fontSize:12, color:'#c45c5c', fontWeight:600 }}>
                                🗑 Удалить заказ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Список товаров ── */}
          {tab === 'list' && (
            <div>
              <div className="admin-stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {[
                  ['Всего товаров', products.length, '🛍️', '#c9748a'],
                  ['Активных', products.filter(p=>p.active).length, '✅', '#3a7a3a'],
                  ['Скрытых', products.filter(p=>!p.active).length, '🙈', '#9e8e85'],
                  ['Категорий', new Set(products.map(p=>p.category)).size, '📂', '#7c6d9a'],
                ].map(([label,val,icon,color],i) => (
                  <div key={i} style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:24 }}>{icon}</span>
                    <div><div style={{ fontSize:20, fontWeight:700, color }}>{val}</div><div style={{ fontSize:11, color:'#9e8e85' }}>{label}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Поиск по названию..."
                  style={{ flex:1, minWidth:180, padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none' }} />
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none', background:'#fff' }}>
                  <option>Все</option>{allCategories.map(c=><option key={c}>{c}</option>)}
                </select>
                <span style={{ fontSize:12, color:'#9e8e85' }}>Найдено: {filtered.length}</span>
              </div>
              {loading ? (
                <div style={{ textAlign:'center', padding:48, color:'#9e8e85' }}>⏳ Загрузка...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 20px', color:'#9e8e85' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🛍️</div>
                  <p style={{ marginBottom:16 }}>Товаров не найдено</p>
                  <button onClick={()=>{setTab('add');resetForm()}} style={{ padding:'10px 24px', background:'#c9748a', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14 }}>Добавить товар</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {filtered.map(p => (
                    <div key={p.id} style={{ background:'#fff', border:`1.5px solid ${p.active?'#ede4dc':'#fca5a5'}`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ width:54, height:70, borderRadius:8, overflow:'hidden', background:'#faf3ed', flexShrink:0, position:'relative' }}>
                        {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Georgia,serif', fontSize:14, marginBottom:3, color:'#3a2f2b', display:'flex', alignItems:'center', gap:6 }}>
                          {p.is_new && <span style={{ background:'#c9748a', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:4 }}>NEW</span>}
                          {p.name}
                        </div>
                        <div style={{ fontSize:11, color:'#9e8e85', display:'flex', gap:10, flexWrap:'wrap' }}>
                          <span>{p.category}</span>
                          <span style={{ color:'#c9748a', fontWeight:600 }}>{p.price?.toLocaleString('ru')} ₽</span>
                          {p.sizes?.length > 0 && <span>Размеры: {p.sizes.join(', ')}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                        <span style={{ padding:'3px 8px', borderRadius:5, fontSize:11, background:p.active?'#edf7ed':'#fef2f2', color:p.active?'#3a7a3a':'#c45c5c', fontWeight:600 }}>
                          {p.active?'● Активен':'● Скрыт'}
                        </span>
                        <button onClick={()=>startEdit(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }}>✏️</button>
                        <button onClick={()=>duplicateProduct(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }}>📋</button>
                        <button onClick={()=>toggleActive(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }}>{p.active?'🙈':'👁'}</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{ padding:'5px 9px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, cursor:'pointer', fontSize:13, color:'#c45c5c' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Форма добавления ── */}
          {tab === 'add' && (
            <div style={{ maxWidth:780 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>
                {editProduct ? '✏️ Редактировать товар' : '➕ Новый товар'}
              </h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:24 }}>
                <div>
                  <ST>📷 Фотографии (до 5 штук)</ST>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', padding:12, background:'#fafafa', borderRadius:12, border:'2px dashed #ede4dc', minHeight:60 }}>
                    {form.images.map((img, idx) => (
                      <div key={idx} draggable onDragStart={()=>handleDragStart(idx)} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropImg(e,idx)}
                        style={{ position:'relative', width:90, height:120, borderRadius:10, overflow:'hidden', border:`2.5px solid ${img.isMain?'#c9748a':'#ede4dc'}`, cursor:'grab', background:'#f5f5f5', flexShrink:0 }}>
                        <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                        <button onClick={()=>setMainImage(idx)} style={{ position:'absolute', top:3, right:22, width:18, height:18, borderRadius:'50%', background:img.isMain?'#c9748a':'rgba(255,255,255,.8)', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', color:img.isMain?'#fff':'#c9748a' }}>★</button>
                        <button onClick={()=>removeImage(idx)} style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.65)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                        {img.isMain && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(201,116,138,.9)', color:'#fff', fontSize:8, textAlign:'center', padding:'2px 0', fontWeight:700 }}>ГЛАВНОЕ</div>}
                      </div>
                    ))}
                    {form.images.length < 5 && (
                      <label style={{ width:90, height:120, borderRadius:10, border:'2px dashed #ede4dc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:uploading?'wait':'pointer', color:'#9e8e85', fontSize:11, gap:4, flexShrink:0 }}>
                        {uploading ? <><span style={{ fontSize:22 }}>⏳</span><span>Загрузка...</span></> : <><span style={{ fontSize:28 }}>+</span><span>Фото</span></>}
                        <input type="file" accept="image/*" multiple onChange={e=>handlePhotoUpload(e.target.files)} disabled={uploading} style={{ display:'none' }} />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <ST>📝 Основная информация</ST>
                  <div className="admin-form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <LB>Название товара *</LB>
                      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Белый кружевной корсет" style={IS} />
                    </div>
                    <div>
                      <LB>Категория *</LB>
                      <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={IS}>
                        {allCategories.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <LB>Цена (₽) *</LB>
                      <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="3500" style={IS} />
                    </div>
                    <div>
                      <LB>Старая цена (₽)</LB>
                      <input type="number" value={form.old_price} onChange={e=>setForm(f=>({...f,old_price:e.target.value}))} placeholder="4500" style={IS} />
                    </div>
                    <div>
                      <LB>Размеры (через запятую)</LB>
                      <input value={form.sizes} onChange={e=>setForm(f=>({...f,sizes:e.target.value}))} placeholder="XS, S, M, L, XL" style={IS} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <LB>Описание товара</LB>
                      <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
                        style={{ ...IS, resize:'vertical', minHeight:80, lineHeight:1.5 }} />
                    </div>
                  </div>
                </div>
                {parsedSizesForStock.length > 0 && (
                  <div>
                    <ST>📦 Количество по размерам</ST>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10 }}>
                      {parsedSizesForStock.map(size => (
                        <div key={size} style={{ background:'#faf3ed', borderRadius:10, padding:'12px', border:'1.5px solid #ede4dc', textAlign:'center' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#c9748a', marginBottom:8 }}>{size}</div>
                          <input type="number" min="0" value={form.sizeStock[size] ?? ''} onChange={e => updateSizeStock(size, e.target.value === '' ? '' : Number(e.target.value))} placeholder="0"
                            style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #ede4dc', borderRadius:7, fontSize:15, fontWeight:700, textAlign:'center', outline:'none', boxSizing:'border-box', background:'#fff' }} />
                          <div style={{ fontSize:10, color:'#9e8e85', marginTop:4 }}>шт</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <ST>⚙️ Параметры</ST>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    {[[form.is_new, v=>setForm(f=>({...f,is_new:v})), '🆕 Отметить как «New»'],[form.active, v=>setForm(f=>({...f,active:v})), '👁 Показывать на сайте']].map(([checked, onChange, label], i) => (
                      <label key={i} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#3a2f2b', padding:'8px 14px', background:checked?'#fdf3f5':'#fafafa', borderRadius:8, border:`1.5px solid ${checked?'#c9748a':'#ede4dc'}` }}>
                        <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{ width:15, height:15, accentColor:'#c9748a' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, paddingTop:8, borderTop:'1px solid #ede4dc' }}>
                  <button onClick={saveProduct} disabled={!form.name||!form.price||loading}
                    style={{ flex:1, padding:14, background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:600 }}>
                    {loading ? '⏳ Сохранение...' : editProduct ? '✅ Сохранить' : '✅ Добавить товар'}
                  </button>
                  <button onClick={()=>{setTab('list');resetForm()}}
                    style={{ padding:'14px 22px', background:'#f5f0ed', border:'1.5px solid #ede4dc', borderRadius:10, fontSize:14, cursor:'pointer', color:'#3a2f2b' }}>
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Промокоды ── */}
          {tab === 'promo' && (
            <div style={{ maxWidth:900 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>🏷️ Промокоды</h2>
              <div style={{background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24, marginBottom:24}}>
                <ST>➕ Создать промокод</ST>
                <div className="admin-promo-grid" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:14}}>
                  <div><LB>Код *</LB><input value={newPromo.code} onChange={e=>setNewPromo(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="SALE20" style={IS} /></div>
                  <div><LB>Тип *</LB><select value={newPromo.discount_type} onChange={e=>setNewPromo(p=>({...p,discount_type:e.target.value}))} style={IS}><option value="percent">Процент (%)</option><option value="fixed">Фиксированная (₽)</option></select></div>
                  <div><LB>Размер скидки *</LB><input type="number" value={newPromo.discount_value} onChange={e=>setNewPromo(p=>({...p,discount_value:e.target.value}))} style={IS} /></div>
                  <div><LB>Мин. сумма (₽)</LB><input type="number" value={newPromo.min_order} onChange={e=>setNewPromo(p=>({...p,min_order:e.target.value}))} placeholder="0" style={IS} /></div>
                  <div><LB>Макс. активаций</LB><input type="number" value={newPromo.max_uses} onChange={e=>setNewPromo(p=>({...p,max_uses:e.target.value}))} placeholder="0 = безлимит" style={IS} /></div>
                  <div><LB>Действует до</LB><input type="date" value={newPromo.expires_at} onChange={e=>setNewPromo(p=>({...p,expires_at:e.target.value}))} style={IS} /></div>
                </div>
                <button onClick={createPromo} style={{padding:'12px 28px',background:'linear-gradient(135deg,#c9748a,#a55570)',color:'#fff',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontWeight:600}}>✅ Создать промокод</button>
              </div>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24 }}>
                <ST>📋 Все промокоды</ST>
                {promosLoading ? <p style={{color:'#9e8e85',textAlign:'center',padding:24}}>⏳ Загрузка...</p>
                : promos.length === 0 ? <p style={{color:'#9e8e85',textAlign:'center',padding:32}}>Промокодов пока нет</p>
                : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {promos.map(p => (
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:p.active?'#fff':'#fafafa',border:`1.5px solid ${p.active?'#ede4dc':'#fca5a5'}`,borderRadius:12,flexWrap:'wrap'}}>
                      <div style={{background:'#fdf3f5',border:'2px solid #f0c8d2',borderRadius:8,padding:'6px 14px',fontFamily:'monospace',fontSize:16,fontWeight:700,color:'#c9748a',letterSpacing:2}}>{p.code}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600,color:'#3a2f2b'}}>Скидка: <span style={{color:'#c9748a'}}>{p.discount_value}{p.discount_type==='percent'?'%':' ₽'}</span></div>
                        <div style={{fontSize:12,color:'#9e8e85'}}>Использовано: {p.used_count||0}{p.max_uses>0?`/${p.max_uses}`:''} раз{p.expires_at?` · до ${new Date(p.expires_at).toLocaleDateString('ru')}`:''}</div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <span style={{padding:'3px 10px',borderRadius:6,fontSize:11,background:p.active?'#edf7ed':'#fef2f2',color:p.active?'#3a7a3a':'#c45c5c',fontWeight:600}}>{p.active?'● Активен':'● Откл.'}</span>
                        <button onClick={()=>togglePromo(p.id,p.active)} style={{padding:'5px 10px',background:'#faf3ed',border:'1px solid #ede4dc',borderRadius:6,cursor:'pointer',fontSize:12}}>{p.active?'Откл.':'Вкл.'}</button>
                        <button onClick={()=>deletePromo(p.id)} style={{padding:'5px 10px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:6,cursor:'pointer',fontSize:12,color:'#c45c5c'}}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>}
              </div>
            </div>
          )}

          {/* ── Категории ── */}
          {tab === 'cats' && (
            <div style={{ maxWidth:780 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>📂 Категории</h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24, marginBottom:20 }}>
                <ST>➕ Добавить категорию</ST>
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} placeholder="Название категории" style={{ ...IS, flex:1 }} />
                  <button onClick={addCategory} disabled={!newCatName.trim()} style={{ padding:'10px 22px', background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600, opacity:!newCatName.trim()?0.5:1 }}>+ Добавить</button>
                </div>
              </div>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24 }}>
                <ST>📂 Все категории ({allCategories.length})</ST>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {allCategories.map((cat, idx) => {
                    const count = products.filter(p => p.category === cat).length
                    return (
                      <div key={cat} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fafafa', border:'1.5px solid #ede4dc', borderRadius:10 }}>
                        <span style={{ fontSize:12, color:'#c9748a', fontWeight:700, minWidth:24 }}>#{idx+1}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:'#3a2f2b' }}>{cat}</div>
                          <div style={{ fontSize:12, color:'#9e8e85' }}>{count === 0 ? 'Нет товаров' : `${count} товаров`}</div>
                        </div>
                        <button onClick={() => removeCategory(cat)} style={{ padding:'6px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, cursor:'pointer', fontSize:12, color:'#c45c5c', fontWeight:600 }}>🗑 Удалить</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Настройки ── */}
          {tab === 'settings' && (
            <div style={{ maxWidth:680 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>⚙️ Настройки сайта</h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:22 }}>
                <div>
                  <ST>🖼️ Главный баннер</ST>
                  {settings.hero_image ? (
                    <div style={{ position:'relative', width:'100%', height:160, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                      <img src={settings.hero_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                        <label style={{ padding:'8px 16px', background:'#fff', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>Заменить<input type="file" accept="image/*" onChange={e=>handleHeroUpload(e.target.files[0])} style={{ display:'none' }} /></label>
                        <button onClick={()=>setSettings(s=>({...s,hero_image:''}))} style={{ padding:'8px 16px', background:'#fef2f2', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, color:'#c45c5c' }}>Удалить</button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:130, border:'2px dashed #ede4dc', borderRadius:12, cursor:'pointer', color:'#9e8e85', background:'#fafafa', marginBottom:12 }}>
                      <span style={{ fontSize:36, marginBottom:8 }}>🖼️</span><span style={{ fontSize:13 }}>Загрузить главное фото</span>
                      <input type="file" accept="image/*" onChange={e=>handleHeroUpload(e.target.files[0])} style={{ display:'none' }} />
                    </label>
                  )}
                  <div style={{ marginBottom:12 }}><LB>Заголовок</LB><input value={settings.hero_title} onChange={e=>setSettings(s=>({...s,hero_title:e.target.value}))} style={IS} /></div>
                  <div><LB>Подзаголовок</LB><input value={settings.hero_subtitle} onChange={e=>setSettings(s=>({...s,hero_subtitle:e.target.value}))} style={IS} /></div>
                </div>
                <div>
                  <ST>🚚 Доставка</ST>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div><LB>Бесплатная доставка от (₽)</LB><input type="number" value={settings.free_delivery_amount} onChange={e=>setSettings(s=>({...s,free_delivery_amount:Number(e.target.value)}))} style={IS} /></div>
                    <div><LB>Стандартная доставка</LB><input value={settings.delivery_cdek||''} onChange={e=>setSettings(s=>({...s,delivery_cdek:e.target.value}))} style={IS} /></div>
                    <div><LB>Срочная доставка</LB><input value={settings.delivery_post||''} onChange={e=>setSettings(s=>({...s,delivery_post:e.target.value}))} style={IS} /></div>
                    <div><LB>Самовывоз</LB><input value={settings.delivery_courier||''} onChange={e=>setSettings(s=>({...s,delivery_courier:e.target.value}))} style={IS} /></div>
                  </div>
                </div>
                <div>
                  <ST>🔒 Политика возврата</ST>
                  <textarea value={settings.return_policy||''} onChange={e=>setSettings(s=>({...s,return_policy:e.target.value}))} rows={3}
                    style={{ ...IS, resize:'vertical', minHeight:70, lineHeight:1.5 }} />
                </div>
                <button onClick={saveSettings} disabled={settingsLoading}
                  style={{ padding:14, background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:600 }}>
                  {settingsLoading ? '⏳ Сохранение...' : '✅ Сохранить настройки'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

function ST({ children }) {
  return <div style={{ fontSize:13, fontWeight:700, color:'#3a2f2b', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #f0e8e0' }}>{children}</div>
}
function LB({ children }) {
  return <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9e8e85', letterSpacing:1, textTransform:'uppercase', marginBottom:5 }}>{children}</label>
}

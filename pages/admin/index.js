import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bellissimo2025'
const CATEGORIES = ['Комплекты', 'Бюстгальтеры', 'Корсеты', 'Пижамы', 'Боди', 'Ночные сорочки', 'Халаты', 'Трусики', 'Чулки', 'Пояса для чулок', 'Купальники']
const BUCKET = 'product'

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('list')
  const [editProduct, setEditProduct] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Все')
  const [dragIdx, setDragIdx] = useState(null)
  const [settings, setSettings] = useState({ 
    hero_title: '', hero_subtitle: '', hero_image: '', free_delivery_amount: 10000,
    delivery_cdek: '590 ₽ · 5–14 дней',
    delivery_post: '1 100 ₽ · 2–5 дней',
    delivery_courier: 'Бесплатно · по договорённости',
    return_policy: 'Нижнее бельё не подлежит обмену и возврату по санитарным нормам'
  })
  const [settingsLoading, setSL] = useState(false)

  const [promos, setPromos] = useState([])
  const [promosLoading, setPromosLoading] = useState(false)
  const [featuredIds, setFeaturedIds] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const [newPromo, setNewPromo] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order: '', starts_at: '', expires_at: '', max_uses: '', categories: [] })
  const ALL_PROMO_CATS = ['Комплекты', 'Бюстгальтеры', 'Корсеты', 'Пижамы', 'Боди', 'Ночные сорочки', 'Халаты', 'Трусики', 'Чулки', 'Пояса для чулок', 'Купальники']

  const emptyForm = {
    name: '', category: 'Комплекты', price: '', old_price: '',
    description: '', sizes: '', sizeStock: {}, is_new: false, active: true,
    images: [], video_url: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { if (auth) { loadProducts(); loadSettings(); loadPromos(); loadFeatured() } }, [auth])

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
    const newIds = featuredIds.includes(id)
      ? featuredIds.filter(x => x !== id)
      : [...featuredIds, id]
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
      active: true,
      used_count: 0
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
    const ext = file.name.split('.').pop().toLowerCase()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(filename, file, {
      cacheControl: '3600', upsert: false, contentType: file.type
    })
    if (error) throw new Error(error.message)
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return publicUrl
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
      } catch (e) {
        showMsg('❌ Ошибка загрузки фото: ' + e.message, 'error')
      }
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
    } catch (e) {
      showMsg('❌ Ошибка видео: ' + e.message, 'error')
    }
    setUploading(false)
  }

  async function handleHeroUpload(file) {
    if (!file) return
    setSL(true)
    try {
      const url = await uploadFile(file, 'hero')
      setSettings(s => ({ ...s, hero_image: url }))
      showMsg('✅ Главное фото загружено!')
    } catch (e) {
      showMsg('❌ ' + e.message, 'error')
    }
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

  // Обновление количества по размеру
  function updateSizeStock(size, value) {
    setForm(f => ({ ...f, sizeStock: { ...f.sizeStock, [size]: value } }))
  }

  async function saveProduct() {
    if (!form.name.trim()) return showMsg('❌ Введите название товара', 'error')
    if (!form.price) return showMsg('❌ Введите цену', 'error')

    const sorted = [...form.images].sort((a, b) => b.isMain - a.isMain)
    const parsedSizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      description: form.description.trim(),
      sizes: parsedSizes,
      size_stock: form.sizeStock || {},
      images: sorted.map(i => i.url),
      video_url: form.video_url || null,
      is_new: form.is_new,
      active: form.active,
    }

    setLoading(true)
    try {
      let error
      if (editProduct) {
        const r = await supabase.from('products').update(payload).eq('id', editProduct.id)
        error = r.error
      } else {
        const r = await supabase.from('products').insert([payload])
        error = r.error
      }
      if (error) throw new Error(error.message)
      showMsg(editProduct ? '✅ Товар обновлён!' : '✅ Товар добавлен!')
      resetForm()
      await loadProducts()
      setTab('list')
    } catch (e) {
      showMsg('❌ Ошибка сохранения: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(p) {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    if (!error) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  async function deleteProduct(id) {
    if (!confirm('Удалить товар? Это нельзя отменить.')) return
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
      name: p.name || '',
      category: p.category || 'Комплекты',
      price: p.price ? String(p.price) : '',
      old_price: p.old_price ? String(p.old_price) : '',
      description: p.description || '',
      sizes: sizes.join(', '),
      sizeStock,
      is_new: p.is_new || false,
      active: p.active !== false,
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

  // Парсим размеры из поля для показа stock
  const parsedSizesForStock = form.sizes.split(',').map(s => s.trim()).filter(Boolean)

  if (!auth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', fontFamily:'sans-serif' }}>
      <div style={{ background:'#fff', padding:48, borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,.3)', textAlign:'center', width:360 }}>
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
      <Head><title>Bellissimo Admin</title></Head>
      <div style={{ minHeight:'100vh', background:'#f8f4f1', fontFamily:"'Nunito Sans',sans-serif" }}>

        {/* Шапка */}
        <div style={{ background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', color:'#fff', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58, position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 16px rgba(0,0,0,.2)', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontFamily:'Georgia,serif', fontSize:18 }}>
            <span style={{ color:'#f0c8d2', fontStyle:'italic' }}>Bellissimo</span>
            <span style={{ opacity:.5, margin:'0 8px' }}>|</span>
            <span style={{ fontSize:12, opacity:.7 }}>Admin</span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['list','📋 Товары', products.length],['add','➕ Добавить'],['featured','✨ Новинки'],['promo','🏷️ Промокоды'],['settings','⚙️ Настройки']].map(([id,label,count]) => (
              <button key={id} onClick={() => { setTab(id); if(id !== 'add') resetForm() }}
                style={{ padding:'6px 14px', background:tab===id?'#c9748a':'rgba(255,255,255,.12)', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:tab===id?600:400 }}>
                {label}{count !== undefined ? ` (${count})` : ''}
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

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 16px' }}>

          {/* ── Список товаров ── */}
          {tab === 'list' && (
            <div>
              {/* Статистика */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
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

              {/* Поиск */}
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', marginBottom:14, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Поиск по названию..."
                  style={{ flex:1, minWidth:180, padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none' }} />
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ padding:'8px 14px', border:'1.5px solid #ede4dc', borderRadius:8, fontSize:14, outline:'none', background:'#fff' }}>
                  <option>Все</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
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
                        {p.video_url && <div style={{ position:'absolute', bottom:2, right:2, background:'rgba(0,0,0,.6)', color:'#fff', fontSize:8, padding:'1px 3px', borderRadius:3 }}>▶</div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'Georgia,serif', fontSize:14, marginBottom:3, color:'#3a2f2b', display:'flex', alignItems:'center', gap:6 }}>
                          {p.is_new && <span style={{ background:'#c9748a', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:4, letterSpacing:1 }}>NEW</span>}
                          {p.name}
                        </div>
                        <div style={{ fontSize:11, color:'#9e8e85', display:'flex', gap:10, flexWrap:'wrap' }}>
                          <span>{p.category}</span>
                          <span style={{ color:'#c9748a', fontWeight:600 }}>{p.price?.toLocaleString('ru')} ₽</span>
                          {p.sizes?.length > 0 && <span>Размеры: {p.sizes.join(', ')}</span>}
                          {p.size_stock && Object.keys(p.size_stock).length > 0 && (
                            <span>Остатки: {Object.entries(p.size_stock).map(([s,q])=>`${s}:${q}`).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                        <span style={{ padding:'3px 8px', borderRadius:5, fontSize:11, background:p.active?'#edf7ed':'#fef2f2', color:p.active?'#3a7a3a':'#c45c5c', fontWeight:600 }}>
                          {p.active?'● Активен':'● Скрыт'}
                        </span>
                        <button onClick={()=>startEdit(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }}>✏️</button>
                        <button onClick={()=>duplicateProduct(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }} title="Дублировать">📋</button>
                        <button onClick={()=>toggleActive(p)} style={{ padding:'5px 9px', background:'#faf3ed', border:'1px solid #ede4dc', borderRadius:6, cursor:'pointer', fontSize:13 }}>{p.active?'🙈':'👁'}</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{ padding:'5px 9px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, cursor:'pointer', fontSize:13, color:'#c45c5c' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Форма добавления/редактирования ── */}
          {tab === 'add' && (
            <div style={{ maxWidth:780 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>
                {editProduct ? '✏️ Редактировать товар' : '➕ Новый товар'}
              </h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:24 }}>

                {/* Фото */}
                <div>
                  <ST>📷 Фотографии (до 5 штук)</ST>
                  <p style={{ fontSize:12, color:'#9e8e85', marginBottom:12 }}>Перетащи для смены порядка · ★ — сделать главным</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', padding:12, background:'#fafafa', borderRadius:12, border:'2px dashed #ede4dc', minHeight:60 }}>
                    {form.images.map((img, idx) => (
                      <div key={idx} draggable onDragStart={()=>handleDragStart(idx)} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropImg(e,idx)}
                        style={{ position:'relative', width:90, height:120, borderRadius:10, overflow:'hidden', border:`2.5px solid ${img.isMain?'#c9748a':'#ede4dc'}`, cursor:'grab', background:'#f5f5f5', flexShrink:0 }}>
                        <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                        <div style={{ position:'absolute', top:3, left:3, background:'rgba(0,0,0,.5)', color:'#fff', fontSize:9, width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{idx+1}</div>
                        <button onClick={()=>setMainImage(idx)} title="Главное"
                          style={{ position:'absolute', top:3, right:22, width:18, height:18, borderRadius:'50%', background:img.isMain?'#c9748a':'rgba(255,255,255,.8)', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', color:img.isMain?'#fff':'#c9748a' }}>★</button>
                        <button onClick={()=>removeImage(idx)}
                          style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.65)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                        {img.isMain && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(201,116,138,.9)', color:'#fff', fontSize:8, textAlign:'center', padding:'2px 0', letterSpacing:1, fontWeight:700 }}>ГЛАВНОЕ</div>}
                      </div>
                    ))}
                    {form.images.length < 5 && (
                      <label style={{ width:90, height:120, borderRadius:10, border:'2px dashed #ede4dc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:uploading?'wait':'pointer', color:'#9e8e85', fontSize:11, gap:4, flexShrink:0 }}>
                        {uploading ? <><span style={{ fontSize:22 }}>⏳</span><span>Загрузка...</span></> : <><span style={{ fontSize:28, lineHeight:1 }}>+</span><span>Фото</span></>}
                        <input type="file" accept="image/*" multiple onChange={e=>handlePhotoUpload(e.target.files)} disabled={uploading} style={{ display:'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Видео */}
                <div>
                  <ST>🎬 Видео (необязательно)</ST>
                  {form.video_url ? (
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'#faf3ed', borderRadius:10, border:'1px solid #ede4dc' }}>
                      <video src={form.video_url} style={{ width:80, height:55, objectFit:'cover', borderRadius:6 }} muted />
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#3a2f2b' }}>✅ Видео загружено</p>
                        <p style={{ fontSize:11, color:'#9e8e85' }}>Будет показано в галерее товара</p>
                      </div>
                      <button onClick={()=>setForm(f=>({...f,video_url:''}))} style={{ padding:'5px 10px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, cursor:'pointer', fontSize:12, color:'#c45c5c' }}>Удалить</button>
                    </div>
                  ) : (
                    <label style={{ display:'flex', alignItems:'center', gap:12, padding:14, border:'2px dashed #ede4dc', borderRadius:10, cursor:'pointer', background:'#fafafa' }}>
                      <span style={{ fontSize:28 }}>🎥</span>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, color:'#3a2f2b' }}>{uploading ? '⏳ Загрузка...' : 'Загрузить видео'}</p>
                        <p style={{ fontSize:11, color:'#9e8e85' }}>MP4, до 50 МБ</p>
                      </div>
                      <input type="file" accept="video/*" onChange={e=>handleVideoUpload(e.target.files[0])} style={{ display:'none' }} />
                    </label>
                  )}
                </div>

                {/* Основная информация */}
                <div>
                  <ST>📝 Основная информация</ST>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <LB>Название товара *</LB>
                      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Белый кружевной корсет" style={IS} />
                    </div>
                    <div>
                      <LB>Категория *</LB>
                      <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={IS}>
                        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <LB>Цена (₽) *</LB>
                      <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="3500" style={IS} />
                    </div>
                    <div>
                      <LB>Старая цена (₽) — для скидки</LB>
                      <input type="number" value={form.old_price} onChange={e=>setForm(f=>({...f,old_price:e.target.value}))} placeholder="4500 (необязательно)" style={IS} />
                    </div>
                    <div>
                      <LB>Размеры (через запятую)</LB>
                      <input value={form.sizes} onChange={e=>setForm(f=>({...f,sizes:e.target.value}))} placeholder="XS, S, M, L, XL" style={IS} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <LB>Описание товара</LB>
                      <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                        placeholder="Материал, особенности, рекомендации по уходу..." rows={3}
                        style={{ ...IS, resize:'vertical', minHeight:80, lineHeight:1.5 }} />
                    </div>
                  </div>
                </div>

                {/* ─ КОЛИЧЕСТВО ПО РАЗМЕРАМ ─ */}
                {parsedSizesForStock.length > 0 && (
                  <div>
                    <ST>📦 Количество товара по размерам</ST>
                    <p style={{ fontSize:12, color:'#9e8e85', marginBottom:12 }}>
                      Укажите остаток на складе для каждого размера. Если оставить 0 — размер будет показан как «нет в наличии».
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10 }}>
                      {parsedSizesForStock.map(size => (
                        <div key={size} style={{ background:'#faf3ed', borderRadius:10, padding:'12px', border:'1.5px solid #ede4dc', textAlign:'center' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#c9748a', marginBottom:8, letterSpacing:1 }}>{size}</div>
                          <input
                            type="number"
                            min="0"
                            value={form.sizeStock[size] ?? ''}
                            onChange={e => updateSizeStock(size, e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #ede4dc', borderRadius:7, fontSize:15, fontWeight:700, textAlign:'center', outline:'none', boxSizing:'border-box', background:'#fff' }}
                          />
                          <div style={{ fontSize:10, color:'#9e8e85', marginTop:4 }}>шт</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, padding:'10px 14px', background:'#fff8f0', borderRadius:8, fontSize:12, color:'#9e8e85' }}>
                      💡 Итого: {parsedSizesForStock.reduce((s, sz) => s + (Number(form.sizeStock[sz]) || 0), 0)} шт на всех размерах
                    </div>
                  </div>
                )}

                {/* Параметры */}
                <div>
                  <ST>⚙️ Параметры</ST>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    {[
                      [form.is_new, v=>setForm(f=>({...f,is_new:v})), '🆕 Отметить как «New»'],
                      [form.active, v=>setForm(f=>({...f,active:v})), '👁 Показывать на сайте'],
                    ].map(([checked, onChange, label], i) => (
                      <label key={i} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#3a2f2b', padding:'8px 14px', background:checked?'#fdf3f5':'#fafafa', borderRadius:8, border:`1.5px solid ${checked?'#c9748a':'#ede4dc'}`, transition:'all .2s' }}>
                        <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{ width:15, height:15, accentColor:'#c9748a' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Кнопки */}
                <div style={{ display:'flex', gap:12, paddingTop:8, borderTop:'1px solid #ede4dc' }}>
                  <button onClick={saveProduct} disabled={!form.name||!form.price||loading}
                    style={{ flex:1, padding:14, background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:600, opacity:(!form.name||!form.price||loading)?.5:1 }}>
                    {loading ? '⏳ Сохранение...' : editProduct ? '✅ Сохранить изменения' : '✅ Добавить товар'}
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

              {/* Создание нового промокода */}
              <div style={{background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24, marginBottom:24}}>
                <ST>➕ Создать промокод</ST>
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:14}}>
                  <div>
                    <LB>Код промокода *</LB>
                    <input value={newPromo.code} onChange={e=>setNewPromo(p=>({...p,code:e.target.value.toUpperCase()}))}
                      placeholder="SALE20" style={IS} />
                    <div style={{fontSize:10,color:'#9e8e85',marginTop:3}}>Только латиница и цифры</div>
                  </div>
                  <div>
                    <LB>Тип скидки *</LB>
                    <select value={newPromo.discount_type} onChange={e=>setNewPromo(p=>({...p,discount_type:e.target.value}))} style={IS}>
                      <option value="percent">Процент (%)</option>
                      <option value="fixed">Фиксированная (₽)</option>
                    </select>
                  </div>
                  <div>
                    <LB>Размер скидки *</LB>
                    <input type="number" value={newPromo.discount_value} onChange={e=>setNewPromo(p=>({...p,discount_value:e.target.value}))}
                      placeholder={newPromo.discount_type==='percent'?'10':'500'} style={IS} />
                  </div>
                  <div>
                    <LB>Мин. сумма заказа (₽)</LB>
                    <input type="number" value={newPromo.min_order} onChange={e=>setNewPromo(p=>({...p,min_order:e.target.value}))}
                      placeholder="0 — без ограничений" style={IS} />
                  </div>
                  <div>
                    <LB>Макс. активаций</LB>
                    <input type="number" value={newPromo.max_uses} onChange={e=>setNewPromo(p=>({...p,max_uses:e.target.value}))}
                      placeholder="0 — безлимит" style={IS} />
                    <div style={{fontSize:10,color:'#9e8e85',marginTop:3}}>0 = неограниченно</div>
                  </div>

                  <div>
                    <LB>Действует С (начало)</LB>
                    <input type="date" value={newPromo.starts_at} onChange={e=>setNewPromo(p=>({...p,starts_at:e.target.value}))} style={IS} />
                    <div style={{fontSize:10,color:'#9e8e85',marginTop:3}}>Пусто = действует с сегодня</div>
                  </div>
                  <div>
                    <LB>Действует ДО (конец)</LB>
                    <input type="date" value={newPromo.expires_at} onChange={e=>setNewPromo(p=>({...p,expires_at:e.target.value}))} style={IS} />
                    <div style={{fontSize:10,color:'#9e8e85',marginTop:3}}>Пусто = бессрочный</div>
                  </div>
                </div>

                <div style={{marginBottom:14}}>
                  <LB>Категории товаров</LB>
                  <div style={{padding:'12px',background:'#fafafa',borderRadius:10,border:'1.5px solid #ede4dc'}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,marginBottom:10,fontWeight:600,color:'#c9748a'}}>
                      <input type="checkbox"
                        checked={newPromo.categories.length===0}
                        onChange={e=>{ if(e.target.checked) setNewPromo(p=>({...p,categories:[]})) }}
                        style={{accentColor:'#c9748a'}} />
                      🏷️ Все категории (применяется к любому товару)
                    </label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      {['Комплекты','Бюстгальтеры','Корсеты','Пижамы','Боди','Ночные сорочки','Халаты','Трусики','Чулки','Пояса для чулок','Купальники'].map(cat => (
                        <label key={cat} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,padding:'5px 10px',background:newPromo.categories.includes(cat)?'#fdf3f5':'#fff',borderRadius:6,border:`1px solid ${newPromo.categories.includes(cat)?'#c9748a':'#ede4dc'}`}}>
                          <input type="checkbox"
                            checked={newPromo.categories.includes(cat)}
                            onChange={e=>{
                              setNewPromo(p=>({...p, categories: e.target.checked
                                ? [...p.categories, cat]
                                : p.categories.filter(c=>c!==cat)
                              }))
                            }}
                            style={{accentColor:'#c9748a'}} />
                          {cat}
                        </label>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:'#9e8e85',marginTop:8}}>
                      {newPromo.categories.length===0
                        ? '✅ Применяется ко всем категориям'
                        : `✅ Только для: ${newPromo.categories.join(', ')}`}
                    </div>
                  </div>
                </div>

                {newPromo.code && newPromo.discount_value && (
                  <div style={{padding:'10px 16px',background:'#fdf3f5',borderRadius:10,marginBottom:14,fontSize:13,border:'1px solid #f0c8d2'}}>
                    <strong>Превью:</strong> «<strong style={{color:'#c9748a'}}>{newPromo.code}</strong>» —{' '}
                    скидка <strong>{newPromo.discount_value}{newPromo.discount_type==='percent'?'%':' ₽'}</strong>
                    {newPromo.categories.length>0&&` на категории: ${newPromo.categories.join(', ')}`}
                    {newPromo.min_order?` · от ${Number(newPromo.min_order).toLocaleString('ru')} ₽`:''}
                    {newPromo.max_uses?` · макс. ${newPromo.max_uses} раз`:' · безлимит'}
                    {newPromo.starts_at?` · с ${new Date(newPromo.starts_at).toLocaleDateString('ru')}`:''}
                    {newPromo.expires_at?` · до ${new Date(newPromo.expires_at).toLocaleDateString('ru')}`:''}
                  </div>
                )}

                <button onClick={createPromo}
                  style={{padding:'12px 28px',background:'linear-gradient(135deg,#c9748a,#a55570)',color:'#fff',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontWeight:600}}>
                  ✅ Создать промокод
                </button>
              </div>

               {/* Список промокодов */}
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:24 }}>
                <ST>📋 Все промокоды</ST>
                {promosLoading ? (
                  <p style={{color:'#9e8e85',textAlign:'center',padding:24}}>⏳ Загрузка...</p>
                ) : promos.length === 0 ? (
                  <p style={{color:'#9e8e85',textAlign:'center',padding:32}}>Промокодов пока нет. Создайте первый!</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {promos.map(p => (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:p.active?'#fff':'#fafafa',border:`1.5px solid ${p.active?'#ede4dc':'#fca5a5'}`,borderRadius:12,flexWrap:'wrap'}}>
                        <div style={{background:'#fdf3f5',border:'2px solid #f0c8d2',borderRadius:8,padding:'6px 14px',fontFamily:'monospace',fontSize:16,fontWeight:700,color:'#c9748a',letterSpacing:2,flexShrink:0}}>
                          {p.code}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,color:'#3a2f2b',marginBottom:4}}>
                            Скидка: <span style={{color:'#c9748a'}}>{p.discount_value}{p.discount_type==='percent'?'%':' ₽'}</span>
                            {p.min_order > 0 && <span style={{color:'#9e8e85',fontSize:12,marginLeft:8}}>от {p.min_order?.toLocaleString('ru')} ₽</span>}
                          </div>
                          <div style={{fontSize:12,color:'#9e8e85',display:'flex',gap:12,flexWrap:'wrap',marginBottom:4}}>
                            <span>Активировано: <strong style={{color:'#3a2f2b'}}>{p.used_count||0}</strong>{p.max_uses>0?`/${p.max_uses}`:''} раз</span>
                            {p.starts_at && <span>С: {new Date(p.starts_at).toLocaleDateString('ru')}</span>}
                            {p.expires_at && <span>До: {new Date(p.expires_at).toLocaleDateString('ru')}</span>}
                          </div>
                          {p.categories?.length>0 && (
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                              {p.categories.map(c=>(
                                <span key={c} style={{padding:'2px 8px',background:'#fdf3f5',border:'1px solid #f0c8d2',borderRadius:4,fontSize:10,color:'#c9748a'}}>{c}</span>
                              ))}
                            </div>
                          )}
                          {(!p.categories||p.categories.length===0) && <span style={{fontSize:11,color:'#9e8e85'}}>📦 Все категории</span>}
                        </div>
                        <div style={{display:'flex',gap:8,flexShrink:0}}>
                          <span style={{padding:'3px 10px',borderRadius:6,fontSize:11,background:p.active?'#edf7ed':'#fef2f2',color:p.active?'#3a7a3a':'#c45c5c',fontWeight:600}}>
                            {p.active?'● Активен':'● Отключён'}
                          </span>
                          <button onClick={()=>togglePromo(p.id,p.active)}
                            style={{padding:'5px 10px',background:'#faf3ed',border:'1px solid #ede4dc',borderRadius:6,cursor:'pointer',fontSize:12}}>
                            {p.active?'Отключить':'Включить'}
                          </button>
                          <button onClick={()=>deletePromo(p.id)}
                            style={{padding:'5px 10px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:6,cursor:'pointer',fontSize:12,color:'#c45c5c'}}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <p style={{ fontSize:12, color:'#9e8e85', marginBottom:14 }}>Фото которое посетители видят при первом заходе</p>
                  {settings.hero_image ? (
                    <div style={{ position:'relative', width:'100%', height:160, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                      <img src={settings.hero_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                        <label style={{ padding:'8px 16px', background:'#fff', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                          Заменить
                          <input type="file" accept="image/*" onChange={e=>handleHeroUpload(e.target.files[0])} style={{ display:'none' }} />
                        </label>
                        <button onClick={()=>setSettings(s=>({...s,hero_image:''}))} style={{ padding:'8px 16px', background:'#fef2f2', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, color:'#c45c5c' }}>Удалить</button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:130, border:'2px dashed #ede4dc', borderRadius:12, cursor:'pointer', color:'#9e8e85', background:'#fafafa', marginBottom:12 }}>
                      <span style={{ fontSize:36, marginBottom:8 }}>🖼️</span>
                      <span style={{ fontSize:13 }}>Загрузить главное фото сайта</span>
                      <input type="file" accept="image/*" onChange={e=>handleHeroUpload(e.target.files[0])} style={{ display:'none' }} />
                    </label>
                  )}
                  <div style={{ marginBottom:12 }}>
                    <LB>Заголовок</LB>
                    <input value={settings.hero_title} onChange={e=>setSettings(s=>({...s,hero_title:e.target.value}))} placeholder="Красота, которая ближе к телу" style={IS} />
                  </div>
                  <div>
                    <LB>Подзаголовок</LB>
                    <input value={settings.hero_subtitle} onChange={e=>setSettings(s=>({...s,hero_subtitle:e.target.value}))} placeholder="Будуарное нижнее бельё для особых моментов" style={IS} />
                  </div>
                </div>
                <div>
                  <ST>🚚 Бесплатная доставка</ST>
                  <LB>Минимальная сумма заказа (₽)</LB>
                  <input type="number" value={settings.free_delivery_amount} onChange={e=>setSettings(s=>({...s,free_delivery_amount:Number(e.target.value)}))} placeholder="10000" style={IS} />
                </div>
                <div>
                  <ST>🚚 Тексты доставки</ST>
                  <p style={{ fontSize:12, color:'#9e8e85', marginBottom:12 }}>Эти тексты отображаются в блоке «Доставка и оплата» на сайте</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div>
                      <LB>Стандартная доставка (Почта РФ)</LB>
                      <input value={settings.delivery_cdek || ''} onChange={e=>setSettings(s=>({...s,delivery_cdek:e.target.value}))} placeholder="590 ₽ · 5–14 дней" style={IS} />
                    </div>
                    <div>
                      <LB>Срочная доставка (Приоритет)</LB>
                      <input value={settings.delivery_post || ''} onChange={e=>setSettings(s=>({...s,delivery_post:e.target.value}))} placeholder="1 100 ₽ · 2–5 дней" style={IS} />
                    </div>
                    <div>
                      <LB>Самовывоз в Калининграде</LB>
                      <input value={settings.delivery_courier || ''} onChange={e=>setSettings(s=>({...s,delivery_courier:e.target.value}))} placeholder="Бесплатно · по договорённости" style={IS} />
                    </div>
                  </div>
                </div>

                <div>
                  <ST>🔒 Политика возврата</ST>
                  <LB>Текст о возврате товара</LB>
                  <textarea value={settings.return_policy || ''} onChange={e=>setSettings(s=>({...s,return_policy:e.target.value}))}
                    placeholder="Нижнее бельё не подлежит обмену и возврату..." rows={3}
                    style={{ ...IS, resize:'vertical', minHeight:70, lineHeight:1.5 }} />
                </div>

                <button onClick={saveSettings} disabled={settingsLoading}
                  style={{ padding:14, background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', border:'none', borderRadius:10, fontSize:15, cursor:'pointer', fontWeight:600, opacity:settingsLoading?.5:1 }}>
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

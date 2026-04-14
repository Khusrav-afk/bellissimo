import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bellissimo2025'
const CATEGORIES = ['Комплекты', 'Бюстгальтеры', 'Корсеты', 'Пижамы', 'Боди', 'Ночные сорочки', 'Халаты', 'Трусики', 'Чулки']
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
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const fileInputRef = useRef()
  const [settings, setSettings] = useState({ hero_title: 'Красота, которая ближе к телу', hero_subtitle: 'Будуарное нижнее бельё для особых моментов', hero_image: '', free_delivery_amount: 10000 })
  const [settingsLoading, setSL] = useState(false)

  const [form, setForm] = useState({
    name: '', category: 'Комплекты', price: '', old_price: '',
    description: '', sizes: '', is_new: false, active: true,
    images: [], video_url: ''
  })

  useEffect(() => { if (auth) { loadProducts(); loadSettings() } }, [auth])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (data) setSettings(data)
    } catch(e) {}
  }

  async function saveSettings() {
    setSL(true)
    await supabase.from('settings').upsert({ id: 1, ...settings })
    setSL(false)
    showMsg('✅ Настройки сохранены!')
  }

  async function uploadFile(file, folder) {
    const ext = file.name.split('.').pop().toLowerCase()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(filename, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return publicUrl
  }

  async function handlePhotoUpload(files) {
    const arr = Array.from(files).slice(0, 5 - form.images.length)
    if (!arr.length) return
    setUploading(true)
    const urls = []
    for (const file of arr) {
      try { urls.push({ url: await uploadFile(file, 'images'), isMain: false }) }
      catch(e) { showMsg('❌ Ошибка: ' + e.message, 'error') }
    }
    setForm(f => {
      const imgs = [...f.images, ...urls]
      if (imgs.length && !imgs.some(i => i.isMain)) imgs[0].isMain = true
      return { ...f, images: imgs }
    })
    setUploading(false)
  }

  async function handleVideoUpload(file) {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, 'videos')
      setForm(f => ({ ...f, video_url: url }))
      showMsg('✅ Видео загружено!')
    } catch(e) { showMsg('❌ ' + e.message, 'error') }
    setUploading(false)
  }

  async function handleHeroUpload(file) {
    if (!file) return
    setSL(true)
    try {
      const url = await uploadFile(file, 'hero')
      setSettings(s => ({ ...s, hero_image: url }))
      showMsg('✅ Главное фото загружено!')
    } catch(e) { showMsg('❌ ' + e.message, 'error') }
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

  async function saveProduct() {
    if (!form.name || !form.price) return showMsg('❌ Заполни название и цену', 'error')
    const sorted = [...form.images].sort((a, b) => b.isMain - a.isMain)
    const payload = {
      name: form.name.trim(), category: form.category,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      description: form.description.trim(),
      sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
      images: sorted.map(i => i.url),
      video_url: form.video_url || null,
      is_new: form.is_new, active: form.active
    }
    setLoading(true)
    const fn = editProduct
      ? supabase.from('products').update(payload).eq('id', editProduct.id)
      : supabase.from('products').insert([payload])
    const { error } = await fn
    if (error) { showMsg('❌ ' + error.message, 'error'); setLoading(false); return }
    showMsg(editProduct ? '✅ Товар обновлён!' : '✅ Товар добавлен!')
    setLoading(false); resetForm(); loadProducts(); setTab('list')
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(x => x.id !== id))
    showMsg('🗑 Удалено')
  }

  async function duplicateProduct(p) {
    const { id, created_at, ...rest } = p
    await supabase.from('products').insert([{ ...rest, name: rest.name + ' (копия)', active: false }])
    loadProducts(); showMsg('✅ Продублировано')
  }

  function startEdit(p) {
    setEditProduct(p)
    setForm({
      name: p.name || '', category: p.category || 'Комплекты',
      price: p.price ? String(p.price) : '',
      old_price: p.old_price ? String(p.old_price) : '',
      description: p.description || '',
      sizes: (p.sizes || []).join(', '),
      is_new: p.is_new || false, active: p.active !== false,
      images: (p.images || []).map((url, i) => ({ url, isMain: i === 0 })),
      video_url: p.video_url || ''
    })
    setTab('add'); window.scrollTo(0, 0)
  }

  function resetForm() {
    setEditProduct(null)
    setForm({ name: '', category: 'Комплекты', price: '', old_price: '', description: '', sizes: '', is_new: false, active: true, images: [], video_url: '' })
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  const filtered = products.filter(p =>
    (filterCat === 'Все' || p.category === filterCat) &&
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()))
  )
  const activeCount = products.filter(p => p.active).length

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

        <div style={{ background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', color:'#fff', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58, position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 16px rgba(0,0,0,.2)', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontFamily:'Georgia,serif', fontSize:18 }}>
            <span style={{ color:'#f0c8d2', fontStyle:'italic' }}>Bellissimo</span>
            <span style={{ opacity:.5, margin:'0 8px' }}>|</span>
            <span style={{ fontSize:12, opacity:.7 }}>Admin</span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['list','📋 Товары',products.length],['add','➕ Добавить'],['settings','⚙️ Настройки']].map(([id,label,count]) => (
              <button key={id} onClick={() => { setTab(id); if(id !== 'add') resetForm() }}
                style={{ padding:'6px 14px', background:tab===id?'#c9748a':'rgba(255,255,255,.12)', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:tab===id?600:400 }}>
                {label}{count !== undefined ? ` (${count})` : ''}
              </button>
            ))}
            <a href="/" target="_blank" style={{ padding:'6px 14px', background:'rgba(255,255,255,.12)', color:'#fff', borderRadius:7, fontSize:13, textDecoration:'none' }}>🌐 Сайт ↗</a>
          </div>
        </div>

        {msg.text && (
          <div style={{ background:msg.type==='error'?'#fef2f2':'#edf7ed', color:msg.type==='error'?'#c45c5c':'#3a7a3a', padding:'10px 24px', textAlign:'center', fontWeight:600, fontSize:13 }}>
            {msg.text}
          </div>
        )}

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>

          {tab === 'list' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                {[
                  ['Всего товаров', products.length, '🛍️', '#c9748a'],
                  ['Активных', activeCount, '✅', '#3a7a3a'],
                  ['Скрытых', products.length - activeCount, '🙈', '#9e8e85'],
                  ['Категорий', new Set(products.map(p=>p.category)).size, '📂', '#7c6d9a'],
                ].map(([label,val,icon,color],i) => (
                  <div key={i} style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:24 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
                      <div style={{ fontSize:11, color:'#9e8e85' }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

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
                          {p.old_price && <span style={{ textDecoration:'line-through' }}>{p.old_price?.toLocaleString('ru')} ₽</span>}
                          {p.sizes?.length > 0 && <span>{p.sizes.join(', ')}</span>}
                          <span>{p.images?.length||0} фото</span>
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

          {tab === 'add' && (
            <div style={{ maxWidth:780 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>
                {editProduct ? '✏️ Редактировать товар' : '➕ Новый товар'}
              </h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:24 }}>

                <div>
                  <ST>📷 Фотографии (до 5 штук)</ST>
                  <p style={{ fontSize:12, color:'#9e8e85', marginBottom:12 }}>Перетащи для смены порядка · Нажми ★ чтобы сделать фото главным</p>
                  <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
                    onDrop={e=>{e.preventDefault();setDragOver(false);handlePhotoUpload(e.dataTransfer.files)}}
                    style={{ border:`2px dashed ${dragOver?'#c9748a':'#ede4dc'}`, borderRadius:12, padding:16, background:dragOver?'#fdf3f5':'#fafafa', transition:'all .2s', minHeight:120 }}>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'flex-start' }}>
                      {form.images.map((img, idx) => (
                        <div key={idx} draggable onDragStart={()=>handleDragStart(idx)} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropImg(e,idx)}
                          style={{ position:'relative', width:90, height:120, borderRadius:10, overflow:'hidden', border:`2.5px solid ${img.isMain?'#c9748a':'#ede4dc'}`, cursor:'grab', background:'#f5f5f5', flexShrink:0 }}>
                          <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                          <div style={{ position:'absolute', top:3, left:3, background:'rgba(0,0,0,.5)', color:'#fff', fontSize:9, width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{idx+1}</div>
                          <button onClick={()=>setMainImage(idx)} title="Сделать главным"
                            style={{ position:'absolute', top:3, right:22, width:18, height:18, borderRadius:'50%', background:img.isMain?'#c9748a':'rgba(255,255,255,.8)', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', color:img.isMain?'#fff':'#c9748a' }}>
                            ★
                          </button>
                          <button onClick={()=>removeImage(idx)}
                            style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.6)', color:'#fff', border:'none', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                          {img.isMain && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(201,116,138,.9)', color:'#fff', fontSize:8, textAlign:'center', padding:'2px 0', letterSpacing:1, fontWeight:700 }}>ГЛАВНОЕ</div>}
                        </div>
                      ))}
                      {form.images.length < 5 && (
                        <label style={{ width:90, height:120, borderRadius:10, border:'2px dashed #ede4dc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:uploading?'wait':'pointer', color:'#9e8e85', fontSize:11, gap:4, background:'#fafafa', flexShrink:0 }}>
                          {uploading ? <><span style={{ fontSize:22 }}>⏳</span><span>Загрузка</span></> : <><span style={{ fontSize:28, lineHeight:1 }}>+</span><span>Добавить фото</span></>}
                          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={e=>handlePhotoUpload(e.target.files)} disabled={uploading} style={{ display:'none' }} />
                        </label>
                      )}
                      {form.images.length === 0 && !uploading && (
                        <div style={{ color:'#c9c0bb', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                          📸 Перетащи фото сюда или нажми «+»
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <ST>🎬 Видео товара (необязательно)</ST>
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
                        <p style={{ fontSize:11, color:'#9e8e85' }}>MP4, до 50 МБ. Автоматически воспроизводится в галерее.</p>
                      </div>
                      <input type="file" accept="video/*" onChange={e=>handleVideoUpload(e.target.files[0])} style={{ display:'none' }} />
                    </label>
                  )}
                </div>

                <div>
                  <ST>📝 Основная информация</ST>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <LB>Название товара *</LB>
                      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Например: Белый кружевной корсет" style={IS} />
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
                      <LB>Описание</LB>
                      <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                        placeholder="Материал, особенности, рекомендации по уходу..." rows={3}
                        style={{ ...IS, resize:'vertical', minHeight:80, lineHeight:1.5 }} />
                    </div>
                  </div>
                </div>

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

          {tab === 'settings' && (
            <div style={{ maxWidth:680 }}>
              <h2 style={{ fontFamily:'Georgia,serif', fontWeight:300, marginBottom:24, color:'#3a2f2b', fontSize:26 }}>⚙️ Настройки сайта</h2>
              <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, display:'flex', flexDirection:'column', gap:22 }}>

                <div>
                  <ST>🖼️ Главный баннер (Hero-секция)</ST>
                  <p style={{ fontSize:12, color:'#9e8e85', marginBottom:14 }}>Большое фото которое посетители видят при первом заходе на сайт</p>
                  {settings.hero_image ? (
                    <div style={{ position:'relative', width:'100%', height:180, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                      <img src={settings.hero_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                        <label style={{ padding:'8px 16px', background:'#fff', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                          Заменить
                          <input type="file" accept="image/*" onChange={e=>handleHeroUpload(e.target.files[0])} style={{ display:'none' }} />
                        </label>
                        <button onClick={()=>setSettings(s=>({...s,hero_image:''}))}
                          style={{ padding:'8px 16px', background:'#fef2f2', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, color:'#c45c5c' }}>Удалить</button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:140, border:'2px dashed #ede4dc', borderRadius:12, cursor:'pointer', color:'#9e8e85', background:'#fafafa', marginBottom:12 }}>
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
                  <LB>Минимальная сумма заказа для бесплатной доставки (₽)</LB>
                  <input type="number" value={settings.free_delivery_amount} onChange={e=>setSettings(s=>({...s,free_delivery_amount:Number(e.target.value)}))} placeholder="10000" style={IS} />
                  <p style={{ fontSize:12, color:'#9e8e85', marginTop:6 }}>При достижении этой суммы покупатель получает бесплатную доставку</p>
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

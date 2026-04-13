import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bellissimo2025'
const CATEGORIES = ['Комплекты', 'Бюстгальтеры', 'Корсеты', 'Пижамы', 'Боди', 'Ночные сорочки', 'Халаты', 'Трусики', 'Чулки']

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('list')
  const [editProduct, setEditProduct] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', category: 'Комплекты', price: '', old_price: '', description: '', sizes: '', is_new: false, active: true, images: [] })

  useEffect(() => { if (auth) loadProducts() }, [auth])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) console.error('Load error:', error)
    setProducts(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const urls = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('product').upload(filename, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (error) { console.error('Upload error:', error); alert('Ошибка загрузки: ' + error.message) }
      else { const { data: u } = supabase.storage.from('product').getPublicUrl(filename); urls.push(u.publicUrl) }
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }))
    setUploading(false)
  }

  function removeImage(idx) { setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) })) }

  async function saveProduct() {
    const payload = { name: form.name, category: form.category, price: Number(form.price), old_price: form.old_price ? Number(form.old_price) : null, description: form.description, sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean), images: form.images, is_new: form.is_new, active: form.active }
    setLoading(true)
    let error
    if (editProduct) { const r = await supabase.from('products').update(payload).eq('id', editProduct.id); error = r.error; if (!error) setMessage('✅ Товар обновлён!') }
    else { const r = await supabase.from('products').insert([payload]); error = r.error; if (!error) setMessage('✅ Товар добавлен!') }
    if (error) { alert('Ошибка: ' + error.message); console.error(error) }
    setLoading(false); resetForm(); loadProducts(); setTab('list')
    setTimeout(() => setMessage(''), 3000)
  }

  async function toggleActive(p) { await supabase.from('products').update({ active: !p.active }).eq('id', p.id); loadProducts() }
  async function deleteProduct(id) { if (!confirm('Удалить товар?')) return; await supabase.from('products').delete().eq('id', id); loadProducts() }

  function startEdit(p) {
    setEditProduct(p)
    setForm({ name: p.name || '', category: p.category || 'Комплекты', price: p.price ? String(p.price) : '', old_price: p.old_price ? String(p.old_price) : '', description: p.description || '', sizes: (p.sizes || []).join(', '), is_new: p.is_new || false, active: p.active !== false, images: p.images || [] })
    setTab('add')
  }

  function resetForm() { setEditProduct(null); setForm({ name: '', category: 'Комплекты', price: '', old_price: '', description: '', sizes: '', is_new: false, active: true, images: [] }) }

  const L = { display: 'block', fontSize: 11, fontWeight: 600, color: '#9e8e85', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }
  const I = { width: '100%', padding: '10px 14px', border: '1.5px solid #ede4dc', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'sans-serif', background: '#fff', color: '#3a2f2b', boxSizing: 'border-box' }

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf9f6', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: 48, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,.08)', textAlign: 'center', width: 340 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, marginBottom: 24, color: '#3a2f2b' }}>Bellissimo Admin</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" onKeyDown={e => e.key === 'Enter' && password === ADMIN_PASSWORD && setAuth(true)}
          style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #ede4dc', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' }} />
        <button onClick={() => password === ADMIN_PASSWORD ? setAuth(true) : alert('Неверный пароль')}
          style={{ width: '100%', padding: 12, background: '#c9748a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Войти</button>
      </div>
    </div>
  )

  return (
    <>
      <Head><title>Bellissimo Admin</title></Head>
      <div style={{ minHeight: '100vh', background: '#fdf9f6', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#3a2f2b', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 20 }}><span style={{ color: '#f0c8d2', fontStyle: 'italic' }}>Bellissimo</span> Admin</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => { setTab('list'); resetForm() }} style={{ padding: '8px 16px', background: tab === 'list' ? '#c9748a' : 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>📋 Товары ({products.length})</button>
            <button onClick={() => { setTab('add'); resetForm() }} style={{ padding: '8px 16px', background: tab === 'add' ? '#c9748a' : 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>➕ Добавить товар</button>
            <a href="/" target="_blank" style={{ padding: '8px 16px', background: 'rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>🌐 Сайт</a>
          </div>
        </div>
        {message && <div style={{ background: '#edf7ed', color: '#3a7a3a', padding: '12px 32px', textAlign: 'center', fontWeight: 600 }}>{message}</div>}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

          {tab === 'list' && (
            <div>
              <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, marginBottom: 24, color: '#3a2f2b', fontSize: 28 }}>Все товары</h2>
              {loading ? <p style={{ color: '#9e8e85', textAlign: 'center', padding: 48 }}>Загрузка...</p>
                : products.length === 0 ? <div style={{ textAlign: 'center', padding: '64px 20px', color: '#9e8e85' }}><div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div><p>Товаров пока нет. Нажмите «Добавить товар».</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {products.map(p => (
                      <div key={p.id} style={{ background: '#fff', border: '1.5px solid #ede4dc', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ width: 64, height: 80, borderRadius: 8, overflow: 'hidden', background: '#faf3ed', flexShrink: 0 }}>
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontFamily: 'Georgia,serif', fontSize: 16, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#9e8e85' }}>{p.category} · {p.price?.toLocaleString('ru')} ₽{p.sizes?.length ? ` · ${p.sizes.join(', ')}` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: p.active ? '#edf7ed' : '#fef2f2', color: p.active ? '#3a7a3a' : '#c45c5c', fontWeight: 600 }}>{p.active ? '✅ Активен' : '🙈 Скрыт'}</span>
                          <button onClick={() => startEdit(p)} style={{ padding: '6px 12px', background: '#faf3ed', border: '1px solid #ede4dc', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Изменить</button>
                          <button onClick={() => toggleActive(p)} style={{ padding: '6px 12px', background: '#faf3ed', border: '1px solid #ede4dc', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{p.active ? '🙈 Скрыть' : '👁 Показать'}</button>
                          <button onClick={() => deleteProduct(p.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#c45c5c' }}>🗑 Удалить</button>
                        </div>
                      </div>
                    ))}
                  </div>}
            </div>
          )}

          {tab === 'add' && (
            <div style={{ maxWidth: 720 }}>
              <h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 300, marginBottom: 24, color: '#3a2f2b', fontSize: 28 }}>{editProduct ? '✏️ Редактировать товар' : '➕ Добавить товар'}</h2>
              <div style={{ background: '#fff', border: '1.5px solid #ede4dc', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={L}>Фотографии товара (до 5 штук)</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    {form.images.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 100, height: 130, borderRadius: 8, overflow: 'hidden', border: '1px solid #ede4dc' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        {idx === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(201,116,138,.9)', color: '#fff', fontSize: 9, textAlign: 'center', padding: '3px 0', letterSpacing: 1 }}>ГЛАВНОЕ</div>}
                      </div>
                    ))}
                    {form.images.length < 5 && (
                      <label style={{ width: 100, height: 130, borderRadius: 8, border: '2px dashed #ede4dc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer', color: '#9e8e85', fontSize: 12, gap: 6 }}>
                        {uploading ? <><span style={{ fontSize: 24 }}>⏳</span><span>Загрузка...</span></> : <><span style={{ fontSize: 24 }}>📷</span><span>Добавить фото</span></>}
                        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#9e8e85' }}>Первое фото — главное. При наведении покажется второе.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={L}>Название товара *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Например: Белый кружевной корсет" style={I} />
                  </div>
                  <div>
                    <label style={L}>Категория *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={I}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div>
                    <label style={L}>Цена (₽) *</label>
                    <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="3500" style={I} />
                  </div>
                  <div>
                    <label style={L}>Старая цена (₽) — для скидки</label>
                    <input type="number" value={form.old_price} onChange={e => setForm(f => ({ ...f, old_price: e.target.value }))} placeholder="4500 (необязательно)" style={I} />
                  </div>
                  <div>
                    <label style={L}>Размеры (через запятую)</label>
                    <input value={form.sizes} onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))} placeholder="XS, S, M, L, XL" style={I} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={L}>Описание</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Короткое описание товара..." rows={3} style={{ ...I, resize: 'vertical', minHeight: 80 }} />
                  </div>
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={form.is_new} onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))} /> Отметить как «New»
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Показывать на сайте
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                  <button onClick={saveProduct} disabled={!form.name || !form.price || loading}
                    style={{ flex: 1, padding: 14, background: '#c9748a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600, opacity: (!form.name || !form.price || loading) ? .5 : 1 }}>
                    {loading ? 'Сохранение...' : editProduct ? '✅ Сохранить изменения' : '✅ Добавить товар'}
                  </button>
                  <button onClick={() => { setTab('list'); resetForm() }}
                    style={{ padding: '14px 24px', background: '#faf3ed', border: '1.5px solid #ede4dc', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Отмена</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

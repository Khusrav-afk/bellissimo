import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'

export default function Home({ initialProducts, settings }) {
  const [products] = useState(initialProducts || [])
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все')
  const [lightbox, setLightbox] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sizeChartOpen, setSizeChartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', comment: '' })
  const [orderSent, setOrderSent] = useState(false)

  const FREE_DELIVERY = settings?.free_delivery_amount || 10000
  const categories = ['Все','Комплекты','Бюстгальтеры','Корсеты','Пижамы','Боди','Ночные сорочки','Халаты','Трусики','Чулки']
  const filtered = activeCategory === 'Все' ? products : products.filter(p => p.category === activeCategory)

  const cartTotal = cart.reduce((s,x) => s + x.price * x.qty, 0)
  const cartCount = cart.reduce((s,x) => s + x.qty, 0)
  const deliveryCost = cartTotal >= FREE_DELIVERY ? 0 : 350
  const orderTotal = cartTotal + deliveryCost
  const leftForFree = FREE_DELIVERY - cartTotal

  const heroImg = settings?.hero_image || products[0]?.images?.[0] || ''
  const heroTitle = settings?.hero_title || 'Красота, которая ближе к телу'
  const heroSubtitle = settings?.hero_subtitle || 'Будуарное нижнее бельё для особых моментов'

  function showToast(text) {
    setToast(text)
    setTimeout(() => setToast(null), 2500)
  }

  function addToCart(product, size) {
    const key = product.id + (size ? '_' + size : '')
    setCart(prev => {
      const ex = prev.find(x => x.key === key)
      if (ex) return prev.map(x => x.key === key ? {...x, qty: x.qty + 1} : x)
      return [...prev, {...product, key, selectedSize: size || null, qty: 1}]
    })
    showToast(`«${product.name}» добавлен в корзину`)
    setCartOpen(true)
  }

  function removeFromCart(key) { setCart(prev => prev.filter(x => x.key !== key)) }

  function changeQty(key, delta) {
    setCart(prev => prev.map(x => {
      if (x.key !== key) return x
      const newQty = x.qty + delta
      if (newQty < 1) return null
      return {...x, qty: newQty}
    }).filter(Boolean))
  }

  function openLightbox(product) {
    setLightbox({ product, mediaIdx: 0, selectedSize: product.sizes?.[0] || null })
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    setLightbox(null)
    document.body.style.overflow = ''
  }

  function nextMedia() {
    if (!lightbox) return
    const total = (lightbox.product.images?.length || 0) + (lightbox.product.video_url ? 1 : 0)
    setLightbox(l => ({...l, mediaIdx: (l.mediaIdx + 1) % total}))
  }

  function prevMedia() {
    if (!lightbox) return
    const total = (lightbox.product.images?.length || 0) + (lightbox.product.video_url ? 1 : 0)
    setLightbox(l => ({...l, mediaIdx: (l.mediaIdx - 1 + total) % total}))
  }

  const lbImgs = lightbox?.product.images || []
  const lbHasVideo = !!lightbox?.product.video_url
  const lbTotal = lbImgs.length + (lbHasVideo ? 1 : 0)
  const lbIdx = lightbox?.mediaIdx || 0
  const lbIsVideo = lbHasVideo && lbIdx >= lbImgs.length
  const lbUrl = lbIsVideo ? lightbox.product.video_url : (lbImgs[lbIdx] || lbImgs[0])

  function sendWhatsApp() {
    const items = cart.map(x => `• ${x.name}${x.selectedSize ? ` (${x.selectedSize})` : ''} × ${x.qty} = ${(x.price * x.qty).toLocaleString('ru')} ₽`).join('\n')
    const msg = `Здравствуйте! Хочу заказать:\n${items}\n\nИтого: ${cartTotal.toLocaleString('ru')} ₽\nДоставка: ${deliveryCost === 0 ? 'бесплатно' : deliveryCost + ' ₽'}`
    window.open(`https://wa.me/79114589339?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function submitOrder(e) {
    e.preventDefault()
    const items = cart.map(x => `• ${x.name}${x.selectedSize ? ` (${x.selectedSize})` : ''} × ${x.qty} — ${(x.price*x.qty).toLocaleString('ru')} ₽`).join('\n')
    const msg = `🛍 НОВЫЙ ЗАКАЗ\n\nПокупатель: ${orderForm.name}\nТелефон: ${orderForm.phone}\nАдрес: ${orderForm.address}\n\nТовары:\n${items}\n\nТовары: ${cartTotal.toLocaleString('ru')} ₽\nДоставка: ${deliveryCost === 0 ? 'бесплатно' : deliveryCost + ' ₽'}\nИТОГО: ${orderTotal.toLocaleString('ru')} ₽\n\nКомментарий: ${orderForm.comment || '—'}`
    window.open(`https://wa.me/79114589339?text=${encodeURIComponent(msg)}`, '_blank')
    setOrderSent(true)
    setTimeout(() => { setOrderSent(false); setCheckoutOpen(false); setCart([]) }, 4000)
  }

  return (
    <>
      <Head>
        <title>Bellissimo Lingerie — Будуарное нижнее бельё</title>
        <meta name="description" content="Интернет-магазин будуарного нижнего белья. Доставка по всей России." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Toast уведомление */}
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.announce}>
        🎁 Бесплатная доставка при заказе от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong> по всей России
      </div>

      <header className={styles.header}>
        <div className={styles.hTop}>
          <button className={styles.mobileToggle} onClick={() => setMenuOpen(true)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/>
            </svg>
          </button>
          <a href="/" className={styles.logo}>
            <span className={styles.logoMain}>Bellissimo</span>
            <span className={styles.logoSub}>Lingerie</span>
          </a>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navInner}>
            {categories.map(cat => (
              <button key={cat} className={`${styles.navLink} ${activeCategory===cat?styles.active:''}`}
                onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
          {categories.map(cat => (
            <button key={cat} className={styles.mobileLink} onClick={() => {setActiveCategory(cat);setMenuOpen(false)}}>{cat}</button>
          ))}
        </div>
      )}

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroTag}>Коллекция 2025</div>
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
          <div className={styles.heroBtns}>
            <a href="#catalog" className={styles.btnFill}>Смотреть каталог</a>
            <a href="#catalog" className={styles.btnGhost}>Все категории</a>
          </div>
        </div>
        <div className={styles.heroVisual}>
          {heroImg && <img src={heroImg} alt="Bellissimo Lingerie" loading="eager" />}
        </div>
      </section>

      {/* Shipping bar */}
      <div className={styles.shippingBar} style={{marginLeft:40,marginRight:40}}>
        <p>🚚 Заказы от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong> — бесплатно</p>
        <div className={styles.shipDiv}/>
        <p>💳 Оплата картой <strong>МИР</strong></p>
        <div className={styles.shipDiv}/>
        <p>📦 По всей <strong>России</strong></p>
        <div className={styles.shipDiv}/>
        <button onClick={() => setSizeChartOpen(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontWeight:600,fontSize:14}}>
          📏 Размерная сетка
        </button>
      </div>

      {/* Каталог */}
      <main className={styles.section} id="catalog">
        <div className={styles.sHeader}>
          <h2>{activeCategory==='Все'?'Все товары':activeCategory}</h2>
          <p>{filtered.length} {filtered.length===1?'товар':filtered.length<5?'товара':'товаров'}</p>
          <div className={styles.dot}/>
        </div>

        <div className={styles.catFilter}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`${styles.catBtn} ${activeCategory===cat?styles.catBtnActive:''}`}>{cat}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛍️</div>
            <p>В этой категории пока нет товаров</p>
          </div>
        ) : (
          <div className={styles.prodGrid}>
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} onOpen={openLightbox} />
            ))}
          </div>
        )}
      </main>

      {/* Доставка */}
      <section className={styles.section} style={{paddingTop:0}}>
        <div className={styles.sHeader}><h2>Доставка и оплата</h2><p>Отправляем по всей России</p><div className={styles.dot}/></div>
        <div className={styles.delCards}>
          <div className={styles.delCard}><div className={styles.di}>📦</div><h4>СДЭК</h4><p>Пункт выдачи или курьер до двери.</p><div className={styles.cost}>от 290 ₽ · 2–5 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>✉️</div><h4>Почта России</h4><p>Любой населённый пункт страны.</p><div className={styles.cost}>от 250 ₽ · 5–10 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>⚡</div><h4>Курьер</h4><p>Москва и СПб — в день заказа.</p><div className={styles.cost}>от 350 ₽ · 1 день</div></div>
        </div>
        <div className={styles.delNote}>
          💳 Оплата картой <strong>МИР</strong> после подтверждения заказа · 🚚 Бесплатно от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong>
        </div>
      </section>

      {/* Преимущества */}
      <section className={styles.trust}>
        <div className={styles.trustGrid}>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🌹</div><h4>Будуарный стиль</h4><p>Изысканное бельё для женщин, которые ценят красоту</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>📸</div><h4>Студийные фото</h4><p>Каждый товар в деталях — несколько ракурсов и видео</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>↩️</div><h4>Обмен 14 дней</h4><p>Не подошёл размер — обменяем без лишних вопросов</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🎁</div><h4>Бережная упаковка</h4><p>Аккуратная упаковка для хрупких тканей и кружева</p></div>
        </div>
      </section>

      {/* WhatsApp баннер */}
      <section className={styles.waBanner}>
        <div className={styles.waInner}>
          <div>
            <h3>Нужна помощь с выбором?</h3>
            <p>Наш менеджер поможет подобрать размер, цвет и комплект. Ответим за 5 минут!</p>
          </div>
          <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={styles.waBtn}>
            💬 Написать в WhatsApp
          </a>
        </div>
      </section>

      {/* Соцсети */}
      <section className={styles.socialStrip}>
        <h3>Мы в социальных сетях</h3>
        <p>Следите за новинками и акциями</p>
        <div className={styles.socialIcons}>
          <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.socBtn}>Telegram</a>
          <a href="https://vk.ru/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.socBtn}>ВКонтакте</a>
          <a href="https://instagram.com/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.socBtn}>Instagram</a>
          <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={styles.socBtn}>WhatsApp</a>
        </div>
      </section>

      {/* Подписка */}
      <section className={styles.nl}>
        <h2>Будьте в курсе</h2>
        <p>Подпишитесь и получите скидку 10% на первый заказ</p>
        <div className={styles.nlForm}>
          <input type="email" placeholder="Ваш e-mail" />
          <button>Подписаться</button>
        </div>
      </section>

      {/* Футер */}
      <footer className={styles.footer}>
        <div className={styles.fGrid}>
          <div className={styles.fBrand}>
            <span className={styles.fLm}>Bellissimo</span>
            <span className={styles.fLs}>Lingerie</span>
            <p>Интернет-магазин будуарного нижнего белья. Изысканные комплекты, корсеты, пижамы. Доставка по всей России.</p>
          </div>
          <div>
            <h5>Каталог</h5>
            <ul>
              {categories.filter(c=>c!=='Все').map(c=>(
                <li key={c}><a href="#" onClick={e=>{e.preventDefault();setActiveCategory(c);window.scrollTo(0,0)}}>{c}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Покупателям</h5>
            <ul>
              <li><a href="#" onClick={e=>{e.preventDefault();setSizeChartOpen(true)}}>Размерная сетка</a></li>
              <li><a href="#">Доставка и оплата</a></li>
              <li><a href="#">Обмен и возврат</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h5>Контакты</h5>
            <ul>
              <li><a href="tel:+79114589339">+7 911 458-93-39</a></li>
              <li><a href="tel:+79062108655">+7 906 210-86-55</a></li>
              <li><a href="https://t.me/bellissimolingerie">Telegram</a></li>
              <li><a href="https://wa.me/79114589339">WhatsApp</a></li>
              <li><a href="https://vk.ru/bellissimolingerie">ВКонтакте</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.fBottom}>
          <span>© 2025 Bellissimo Lingerie. Все права защищены.</span>
          <div className={styles.fPay}><span>МИР</span><span>СБП</span></div>
        </div>
      </footer>

      {/* ── КОРЗИНА ── */}
      {cartOpen && <div className={styles.cartOverlay} onClick={() => setCartOpen(false)} />}
      <div className={`${styles.cartSidebar} ${cartOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <h3>Корзина {cartCount > 0 && <span style={{fontSize:14,color:'var(--muted)',fontWeight:400}}>({cartCount} шт)</span>}</h3>
          <button onClick={() => setCartOpen(false)}>✕</button>
        </div>

        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}>
              <div>🛍️</div>
              <p>Корзина пуста</p>
              <button onClick={() => setCartOpen(false)} style={{marginTop:12,padding:'8px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13}}>
                Перейти в каталог
              </button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.key} className={styles.cartItem}>
                  {item.images?.[0] && <img src={item.images[0]} alt={item.name} />}
                  <div className={styles.cartItemInfo}>
                    <div className={styles.cartItemName}>{item.name}</div>
                    <div className={styles.cartItemCat}>
                      {item.category}
                      {item.selectedSize && <span style={{marginLeft:6,padding:'2px 6px',background:'var(--bg2)',borderRadius:4,fontSize:10}}>{item.selectedSize}</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',borderRadius:6,overflow:'hidden'}}>
                        <button onClick={() => changeQty(item.key, -1)} style={{width:28,height:28,background:'none',border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                        <span style={{width:28,textAlign:'center',fontSize:13,fontWeight:600}}>{item.qty}</span>
                        <button onClick={() => changeQty(item.key, +1)} style={{width:28,height:28,background:'none',border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      </div>
                      <div className={styles.cartItemPrice}>{(item.price * item.qty).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  <button className={styles.cartRemove} onClick={() => removeFromCart(item.key)}>×</button>
                </div>
              ))}

              {/* Прогресс до бесплатной доставки */}
              {leftForFree > 0 && (
                <div style={{padding:'12px',background:'var(--bg2)',borderRadius:10,margin:'8px 0'}}>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>
                    До бесплатной доставки ещё <strong style={{color:'var(--accent-dark)'}}>{leftForFree.toLocaleString('ru')} ₽</strong>
                  </div>
                  <div style={{height:4,background:'var(--border)',borderRadius:2}}>
                    <div style={{height:'100%',background:'var(--accent)',borderRadius:2,width:`${Math.min(100,(cartTotal/FREE_DELIVERY)*100)}%`,transition:'width .4s'}}/>
                  </div>
                </div>
              )}
              {leftForFree <= 0 && (
                <div style={{padding:'10px 14px',background:'#edf7ed',borderRadius:10,fontSize:13,color:'#3a7a3a',fontWeight:600,margin:'8px 0'}}>
                  🎉 Бесплатная доставка включена!
                </div>
              )}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.cartFooter}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:14,color:'var(--muted)'}}>
              <span>Товары:</span><span>{cartTotal.toLocaleString('ru')} ₽</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:14,color:'var(--muted)'}}>
              <span>Доставка:</span>
              <span style={{color:deliveryCost===0?'#3a7a3a':'inherit',fontWeight:deliveryCost===0?600:'inherit'}}>
                {deliveryCost === 0 ? '🎁 Бесплатно' : `~${deliveryCost} ₽`}
              </span>
            </div>
            <div className={styles.cartTotal}><span>Итого:</span><strong>{orderTotal.toLocaleString('ru')} ₽</strong></div>

            <button className={styles.orderBtn} onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>
              Оформить заказ →
            </button>
            <button onClick={sendWhatsApp}
              style={{width:'100%',padding:'12px',background:'#25d366',color:'#fff',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:600,marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              💬 Заказать через WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* ── ОФОРМЛЕНИЕ ЗАКАЗА ── */}
      {checkoutOpen && (
        <div className={styles.lbOverlay} onClick={() => setCheckoutOpen(false)}>
          <div style={{background:'#fff',borderRadius:20,maxWidth:480,width:'100%',padding:32,position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button onClick={() => setCheckoutOpen(false)} className={styles.lbClose}>✕</button>

            {orderSent ? (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:64,marginBottom:16}}>✅</div>
                <h3 style={{fontFamily:'Georgia,serif',fontSize:24,fontWeight:300,marginBottom:8,color:'var(--text)'}}>Заказ отправлен!</h3>
                <p style={{color:'var(--muted)',fontSize:14}}>Менеджер свяжется с вами в WhatsApp в течение 5 минут</p>
              </div>
            ) : (
              <>
                <h3 style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:300,marginBottom:4,color:'var(--text)'}}>Оформление заказа</h3>
                <p style={{fontSize:13,color:'var(--muted)',marginBottom:24}}>Заполните форму — мы свяжемся с вами через WhatsApp</p>

                <form onSubmit={submitOrder} style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[
                    ['name','Ваше имя *','Анна','text'],
                    ['phone','Телефон *','+7 (___) ___-__-__','tel'],
                    ['address','Город и адрес доставки *','Москва, ул. Примерная, д. 1','text'],
                  ].map(([field, label, placeholder, type]) => (
                    <div key={field}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>{label}</label>
                      <input type={type} required value={orderForm[field]} onChange={e=>setOrderForm(f=>({...f,[field]:e.target.value}))} placeholder={placeholder}
                        style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box'}} />
                    </div>
                  ))}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Комментарий</label>
                    <textarea value={orderForm.comment} onChange={e=>setOrderForm(f=>({...f,comment:e.target.value}))} placeholder="Пожелания, уточнения..." rows={2}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box'}} />
                  </div>

                  <div style={{background:'var(--bg2)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>Товары:</span><span>{cartTotal.toLocaleString('ru')} ₽</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>Доставка:</span><span style={{color:deliveryCost===0?'#3a7a3a':'inherit'}}>{deliveryCost===0?'Бесплатно':`~${deliveryCost} ₽`}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,borderTop:'1px solid var(--border)',paddingTop:8,marginTop:4}}><span>Итого:</span><span style={{color:'var(--accent-dark)'}}>{orderTotal.toLocaleString('ru')} ₽</span></div>
                  </div>

                  <button type="submit" style={{padding:'14px',background:'#25d366',color:'#fff',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    💬 Подтвердить через WhatsApp
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── РАЗМЕРНАЯ СЕТКА ── */}
      {sizeChartOpen && (
        <div className={styles.lbOverlay} onClick={() => setSizeChartOpen(false)}>
          <div style={{background:'#fff',borderRadius:20,maxWidth:600,width:'100%',padding:32,maxHeight:'90vh',overflowY:'auto',position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button onClick={() => setSizeChartOpen(false)} className={styles.lbClose}>✕</button>
            <h3 style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:300,marginBottom:4}}>Размерная сетка</h3>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>Все размеры указаны для российских стандартов</p>

            <h4 style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--text)'}}>ОДЕЖДА (пижамы, халаты, сорочки)</h4>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:24}}>
              <thead>
                <tr style={{background:'var(--bg2)'}}>
                  {['Размер','Грудь (см)','Талия (см)','Бёдра (см)'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,borderBottom:'2px solid var(--border)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[['XS (42)','80–84','60–64','86–90'],['S (44)','84–88','64–68','90–94'],['M (46)','88–92','68–72','94–98'],['L (48)','92–96','72–76','98–102'],['XL (50)','96–100','76–80','102–106'],['XXL (52)','100–104','80–84','106–110']].map(([size,...vals],i)=>(
                  <tr key={size} style={{background:i%2===0?'#fff':'var(--bg)'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:'var(--accent-dark)'}}>{size}</td>
                    {vals.map((v,j)=><td key={j} style={{padding:'8px 12px',color:'var(--text)'}}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{fontSize:13,fontWeight:700,marginBottom:10,color:'var(--text)'}}>БЮСТГАЛЬТЕРЫ</h4>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
              <thead>
                <tr style={{background:'var(--bg2)'}}>
                  {['Размер','Объём груди (см)','Обхват под грудью (см)'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,borderBottom:'2px solid var(--border)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[['75A','83–85','73–77'],['75B','85–87','73–77'],['80B','88–90','78–82'],['80C','90–92','78–82'],['85B','93–95','83–87'],['85C','95–97','83–87'],['90C','98–100','88–92'],['90D','100–102','88–92']].map(([size,...vals],i)=>(
                  <tr key={size} style={{background:i%2===0?'#fff':'var(--bg)'}}>
                    <td style={{padding:'8px 12px',fontWeight:700,color:'var(--accent-dark)'}}>{size}</td>
                    {vals.map((v,j)=><td key={j} style={{padding:'8px 12px',color:'var(--text)'}}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{padding:'12px',background:'#fff8f0',borderRadius:8,fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
              💡 <strong>Совет:</strong> Если вы не знаете свой размер — замерьте сантиметровой лентой обхват груди, талии и бёдер. Или напишите нам в WhatsApp — поможем подобрать!
            </div>
          </div>
        </div>
      )}

      {/* ── ЛАЙТБОКС ── */}
      {lightbox !== null && (
        <div className={styles.lbOverlay} onClick={closeLightbox}>
          <div className={styles.lbBox} onClick={e => e.stopPropagation()}>
            <button className={styles.lbClose} onClick={closeLightbox}>✕</button>

            <div className={styles.lbMain}>
              {lbTotal > 1 && <button className={styles.lbPrev} onClick={e=>{e.stopPropagation();prevMedia()}}>‹</button>}
              {lbIsVideo ? (
                <video src={lbUrl} controls autoPlay muted loop className={styles.lbImg} style={{objectFit:'contain',background:'#000'}} />
              ) : (
                <img src={lbUrl} alt={lightbox.product.name} className={styles.lbImg} />
              )}
              {lbTotal > 1 && <button className={styles.lbNext} onClick={e=>{e.stopPropagation();nextMedia()}}>›</button>}
            </div>

            {lbTotal > 1 && (
              <div className={styles.lbThumbs}>
                {lbImgs.map((url, idx) => (
                  <div key={idx} className={`${styles.lbThumb} ${idx===lightbox.mediaIdx?styles.lbThumbActive:''}`}
                    onClick={e=>{e.stopPropagation();setLightbox(l=>({...l,mediaIdx:idx}))}}>
                    <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top',borderRadius:6}} />
                  </div>
                ))}
                {lbHasVideo && (
                  <div className={`${styles.lbThumb} ${lbImgs.length===lightbox.mediaIdx?styles.lbThumbActive:''}`}
                    onClick={e=>{e.stopPropagation();setLightbox(l=>({...l,mediaIdx:lbImgs.length}))}}>
                    <div style={{width:'100%',height:'100%',background:'#3a2f2b',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:18,borderRadius:6}}>▶</div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.lbInfo}>
              <div className={styles.lbCat}>{lightbox.product.category}</div>
              <div className={styles.lbName}>{lightbox.product.name}</div>
              <div className={styles.lbPrices}>
                <span className={styles.lbPrice}>{lightbox.product.price?.toLocaleString('ru')} ₽</span>
                {lightbox.product.old_price && <span className={styles.lbOld}>{lightbox.product.old_price.toLocaleString('ru')} ₽</span>}
              </div>
              {lightbox.product.description && <p className={styles.lbDesc}>{lightbox.product.description}</p>}

              {lightbox.product.sizes?.length > 0 && (
                <div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:600,letterSpacing:.5}}>
                    РАЗМЕР:
                    <button onClick={() => setSizeChartOpen(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:11,marginLeft:8,textDecoration:'underline'}}>
                      размерная сетка
                    </button>
                  </div>
                  <div className={styles.lbSizes}>
                    {lightbox.product.sizes.map(s => (
                      <span key={s} className={`${styles.lbSize} ${lightbox.selectedSize===s?styles.lbSizeActive:''}`}
                        onClick={() => setLightbox(l => ({...l, selectedSize: s}))}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.lbAddBtn}
                onClick={() => { addToCart(lightbox.product, lightbox.selectedSize); closeLightbox() }}>
                + В корзину {lightbox.selectedSize && `(${lightbox.selectedSize})`}
              </button>

              <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',background:'#f0faf3',color:'#2d7a47',borderRadius:10,fontSize:13,textDecoration:'none',fontWeight:600,border:'1px solid #c6e9d0'}}>
                💬 Задать вопрос о товаре
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ProductCard({ product, onAddToCart, onOpen }) {
  const [imgIdx, setImgIdx] = useState(0)
  const imgs = product.images || []
  const hasVideo = !!product.video_url

  return (
    <div className={styles.prodCard} onClick={() => onOpen(product)}>
      <div className={styles.prodImg}
        onMouseEnter={() => imgs.length > 1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}>
        {imgs[imgIdx] && <img src={imgs[imgIdx]} alt={product.name} loading="lazy" />}
        {product.is_new && <span className={styles.tagNew}>New</span>}
        {hasVideo && <span className={styles.tagVideo}>▶ видео</span>}
        <button className={styles.addBar} onClick={e => { e.stopPropagation(); onOpen(product) }}>
          Выбрать размер →
        </button>
      </div>
      <div className={styles.prodBody}>
        <div className={styles.prodCat}>{product.category}</div>
        <div className={styles.prodName}>{product.name}</div>
        <div className={styles.prodPrices}>
          <span className={styles.now}>{product.price?.toLocaleString('ru')} ₽</span>
          {product.old_price && <span className={styles.was}>{product.old_price.toLocaleString('ru')} ₽</span>}
        </div>
        {product.sizes?.length > 0 && (
          <div className={styles.prodSizes}>
            {product.sizes.map(s => <span key={s}>{s}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  try {
    const [productsRes, settingsRes] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('settings').select('*').eq('id', 1).single()
    ])
    return { props: { initialProducts: productsRes.data || [], settings: settingsRes.data || null } }
  } catch {
    return { props: { initialProducts: [], settings: null } }
  }
}

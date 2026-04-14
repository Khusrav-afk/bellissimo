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

  const FREE_DELIVERY = settings?.free_delivery_amount || 10000
  const categories = ['Все','Комплекты','Бюстгальтеры','Корсеты','Пижамы','Боди','Ночные сорочки','Халаты','Трусики','Чулки']
  const filtered = activeCategory === 'Все' ? products : products.filter(p => p.category === activeCategory)
  const cartTotal = cart.reduce((s,x) => s + x.price * x.qty, 0)
  const cartCount = cart.reduce((s,x) => s + x.qty, 0)
  const leftForFree = FREE_DELIVERY - cartTotal

  const heroImg = settings?.hero_image || products[0]?.images?.[0] || ''
  const heroTitle = settings?.hero_title || 'Красота, которая ближе к телу'
  const heroSubtitle = settings?.hero_subtitle || 'Будуарное нижнее бельё для особых моментов'

  function addToCart(product) {
    setCart(prev => {
      const ex = prev.find(x => x.id === product.id)
      if (ex) return prev.map(x => x.id === product.id ? {...x, qty: x.qty+1} : x)
      return [...prev, {...product, qty: 1}]
    })
    setCartOpen(true)
  }

  function removeFromCart(id) { setCart(prev => prev.filter(x => x.id !== id)) }

  function openLightbox(product) {
    setLightbox({ product, mediaIdx: 0 })
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() {
    setLightbox(null)
    document.body.style.overflow = ''
  }

  function nextMedia() {
    if (!lightbox) return
    const total = (lightbox.product.images?.length || 0) + (lightbox.product.video_url ? 1 : 0)
    setLightbox(l => ({ ...l, mediaIdx: (l.mediaIdx + 1) % total }))
  }

  function prevMedia() {
    if (!lightbox) return
    const total = (lightbox.product.images?.length || 0) + (lightbox.product.video_url ? 1 : 0)
    setLightbox(l => ({ ...l, mediaIdx: (l.mediaIdx - 1 + total) % total }))
  }

  // Лайтбокс — текущий медиа элемент
  const lbMedia = lightbox ? (() => {
    const imgs = lightbox.product.images || []
    const hasVideo = !!lightbox.product.video_url
    const idx = lightbox.mediaIdx
    if (idx < imgs.length) return { type: 'image', url: imgs[idx] }
    if (hasVideo) return { type: 'video', url: lightbox.product.video_url }
    return { type: 'image', url: imgs[0] }
  })() : null

  const lbTotal = lightbox
    ? (lightbox.product.images?.length || 0) + (lightbox.product.video_url ? 1 : 0)
    : 0

  return (
    <>
      <Head>
        <title>Bellissimo Lingerie — Будуарное нижнее бельё</title>
        <meta name="description" content="Интернет-магазин будуарного нижнего белья. Доставка по всей России." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

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
          <button className={styles.cartBtn} onClick={() => setCartOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
          </button>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navInner}>
            {categories.map(cat => (
              <button key={cat}
                className={`${styles.navLink} ${activeCategory === cat ? styles.active : ''}`}
                onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
          {categories.map(cat => (
            <button key={cat} className={styles.mobileLink}
              onClick={() => { setActiveCategory(cat); setMenuOpen(false) }}>
              {cat}
            </button>
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

      <div className={styles.shippingBar} style={{ marginLeft:40, marginRight:40 }}>
        <p>🚚 Заказы от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong> — бесплатно</p>
        <div className={styles.shipDiv} />
        <p>💳 Оплата картой <strong>МИР</strong></p>
        <div className={styles.shipDiv} />
        <p>📦 По всей <strong>России</strong></p>
      </div>

      {/* Каталог */}
      <main className={styles.section} id="catalog">
        <div className={styles.sHeader}>
          <h2>{activeCategory === 'Все' ? 'Все товары' : activeCategory}</h2>
          <p>{filtered.length} {filtered.length === 1 ? 'товар' : filtered.length < 5 ? 'товара' : 'товаров'}</p>
          <div className={styles.dot} />
        </div>

        <div className={styles.catFilter}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}>
              {cat}
            </button>
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
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
                onOpen={openLightbox}
              />
            ))}
          </div>
        )}
      </main>

      {/* Доставка */}
      <section className={styles.section} style={{ paddingTop:0 }}>
        <div className={styles.sHeader}><h2>Доставка</h2><p>Отправляем по всей России</p><div className={styles.dot} /></div>
        <div className={styles.delCards}>
          <div className={styles.delCard}><div className={styles.di}>📦</div><h4>СДЭК</h4><p>Пункт выдачи или курьер до двери.</p><div className={styles.cost}>от 290 ₽ · 2–5 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>✉️</div><h4>Почта России</h4><p>Любой населённый пункт.</p><div className={styles.cost}>от 250 ₽ · 5–10 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>⚡</div><h4>Курьер</h4><p>Москва и СПб — в день заказа.</p><div className={styles.cost}>от 350 ₽ · 1 день</div></div>
        </div>
        <div className={styles.delNote}>💳 Оплата картой <strong>МИР</strong> · 🚚 Бесплатно от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong></div>
      </section>

      {/* Преимущества */}
      <section className={styles.trust}>
        <div className={styles.trustGrid}>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🌹</div><h4>Будуарный стиль</h4><p>Изысканное бельё для женщин, которые ценят красоту</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>📸</div><h4>Студийные фото</h4><p>Каждый товар в деталях — несколько ракурсов и видео</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>💳</div><h4>Безопасная оплата</h4><p>Карта МИР, оплата после оформления</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🎁</div><h4>Бережная упаковка</h4><p>Аккуратная упаковка для хрупких тканей</p></div>
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
        <p>Подпишитесь и получите скидку на первый заказ</p>
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
            <p>Интернет-магазин будуарного нижнего белья. Доставка по всей России.</p>
          </div>
          <div>
            <h5>Каталог</h5>
            <ul>
              {categories.filter(c => c !== 'Все').map(c => (
                <li key={c}>
                  <a href="#" onClick={e => { e.preventDefault(); setActiveCategory(c); window.scrollTo(0,0) }}>{c}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Покупателям</h5>
            <ul>
              <li><a href="#">Доставка и оплата</a></li>
              <li><a href="#">Обмен и возврат</a></li>
              <li><a href="#">Размерная сетка</a></li>
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
          <span>© 2025 Bellissimo Lingerie</span>
          <div className={styles.fPay}><span>МИР</span><span>СБП</span></div>
        </div>
      </footer>

      {/* Корзина */}
      {cartOpen && <div className={styles.cartOverlay} onClick={() => setCartOpen(false)} />}
      <div className={`${styles.cartSidebar} ${cartOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <h3>Корзина</h3>
          <button onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}><div>🛍️</div><p>Корзина пуста</p></div>
          ) : (
            cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                {item.images?.[0] && <img src={item.images[0]} alt={item.name} />}
                <div className={styles.cartItemInfo}>
                  <div className={styles.cartItemName}>{item.name}</div>
                  <div className={styles.cartItemCat}>{item.category} · {item.qty} шт</div>
                  <div className={styles.cartItemPrice}>{(item.price * item.qty).toLocaleString('ru')} ₽</div>
                </div>
                <button className={styles.cartRemove} onClick={() => removeFromCart(item.id)}>×</button>
              </div>
            ))
          )}
        </div>
        <div className={styles.cartFooter}>
          <div className={styles.cartTotal}><span>Итого:</span><strong>{cartTotal.toLocaleString('ru')} ₽</strong></div>
          <div className={`${styles.delivNote} ${leftForFree <= 0 ? styles.free : ''}`}>
            {leftForFree <= 0
              ? '🎉 Бесплатная доставка включена!'
              : `Ещё ${leftForFree.toLocaleString('ru')} ₽ — доставка бесплатная`}
          </div>
          <button className={styles.orderBtn}>Оформить заказ</button>
        </div>
      </div>

      {/* Лайтбокс */}
      {lightbox !== null && lbMedia !== null && (
        <div className={styles.lbOverlay} onClick={closeLightbox}>
          <div className={styles.lbBox} onClick={e => e.stopPropagation()}>
            <button className={styles.lbClose} onClick={closeLightbox}>✕</button>

            {/* Медиа */}
            <div className={styles.lbMain}>
              {lbTotal > 1 && (
                <button className={styles.lbPrev} onClick={e => { e.stopPropagation(); prevMedia() }}>‹</button>
              )}
              {lbMedia.type === 'video' ? (
                <video
                  src={lbMedia.url}
                  controls
                  autoPlay
                  muted
                  loop
                  className={styles.lbImg}
                  style={{ objectFit:'contain', background:'#000' }}
                />
              ) : (
                <img src={lbMedia.url} alt={lightbox.product.name} className={styles.lbImg} />
              )}
              {lbTotal > 1 && (
                <button className={styles.lbNext} onClick={e => { e.stopPropagation(); nextMedia() }}>›</button>
              )}
            </div>

            {/* Миниатюры */}
            {lbTotal > 1 && (
              <div className={styles.lbThumbs}>
                {(lightbox.product.images || []).map((url, idx) => (
                  <div key={idx}
                    className={`${styles.lbThumb} ${idx === lightbox.mediaIdx ? styles.lbThumbActive : ''}`}
                    onClick={e => { e.stopPropagation(); setLightbox(l => ({...l, mediaIdx: idx})) }}>
                    <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top', borderRadius:6 }} />
                  </div>
                ))}
                {lightbox.product.video_url && (
                  <div
                    className={`${styles.lbThumb} ${lightbox.mediaIdx === (lightbox.product.images?.length || 0) ? styles.lbThumbActive : ''}`}
                    onClick={e => { e.stopPropagation(); setLightbox(l => ({...l, mediaIdx: lightbox.product.images?.length || 0})) }}>
                    <div style={{ width:'100%', height:'100%', background:'#3a2f2b', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20, borderRadius:6 }}>▶</div>
                  </div>
                )}
              </div>
            )}

            {/* Инфо */}
            <div className={styles.lbInfo}>
              <div className={styles.lbCat}>{lightbox.product.category}</div>
              <div className={styles.lbName}>{lightbox.product.name}</div>
              <div className={styles.lbPrices}>
                <span className={styles.lbPrice}>{lightbox.product.price?.toLocaleString('ru')} ₽</span>
                {lightbox.product.old_price && (
                  <span className={styles.lbOld}>{lightbox.product.old_price.toLocaleString('ru')} ₽</span>
                )}
              </div>
              {lightbox.product.description && (
                <p className={styles.lbDesc}>{lightbox.product.description}</p>
              )}
              {lightbox.product.sizes?.length > 0 && (
                <div className={styles.lbSizes}>
                  <span style={{ fontSize:12, color:'#9e8e85', marginRight:8 }}>Размеры:</span>
                  {lightbox.product.sizes.map(s => (
                    <span key={s} className={styles.lbSize}>{s}</span>
                  ))}
                </div>
              )}
              <button className={styles.lbAddBtn}
                onClick={() => { addToCart(lightbox.product); closeLightbox() }}>
                + В корзину
              </button>
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
        <button className={styles.addBar}
          onClick={e => { e.stopPropagation(); onAddToCart(product) }}>
          + В корзину
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
    return {
      props: {
        initialProducts: productsRes.data || [],
        settings: settingsRes.data || null
      }
    }
  } catch {
    return { props: { initialProducts: [], settings: null } }
  }
}

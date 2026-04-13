import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'

const FREE_DELIVERY = 10000

export default function Home({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts || [])
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все')

  const categories = ['Все', 'Комплекты', 'Бюстгальтеры', 'Корсеты', 'Пижамы', 'Боди', 'Ночные сорочки', 'Халаты', 'Трусики', 'Чулки']

  const filtered = activeCategory === 'Все'
    ? products
    : products.filter(p => p.category === activeCategory)

  const cartTotal = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const cartCount = cart.reduce((s, x) => s + x.qty, 0)
  const leftForFree = FREE_DELIVERY - cartTotal

  function addToCart(product) {
    setCart(prev => {
      const ex = prev.find(x => x.id === product.id)
      if (ex) return prev.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, { ...product, qty: 1 }]
    })
    setCartOpen(true)
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(x => x.id !== id))
  }

  return (
    <>
      <Head>
        <title>Bellissimo Lingerie — Будуарное нижнее бельё</title>
        <meta name="description" content="Интернет-магазин будуарного нижнего белья. Доставка по всей России." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Announce */}
      <div className={styles.announce}>
        🎁 Бесплатная доставка при заказе от <strong>10 000 ₽</strong> по всей России
      </div>

      {/* Header */}
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
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
          </button>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navInner}>
            {categories.map(cat => (
              <button key={cat} className={`${styles.navLink} ${activeCategory === cat ? styles.active : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
          {categories.map(cat => (
            <button key={cat} className={styles.mobileLink} onClick={() => { setActiveCategory(cat); setMenuOpen(false) }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      {products.length > 0 && (
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.heroTag}>Коллекция 2025</div>
            <h1>Красота,<br />которая <em>ближе</em><br />к телу</h1>
            <p>Будуарное нижнее бельё для тех, кто ценит нежность и элегантность.</p>
            <div className={styles.heroBtns}>
              <a href="#catalog" className={styles.btnFill}>Смотреть каталог</a>
              <a href="#categories" className={styles.btnGhost}>Все категории</a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            {products[0]?.images?.[0] && (
              <img src={products[0].images[0]} alt="Bellissimo Lingerie" loading="eager" />
            )}
          </div>
        </section>
      )}

      {/* Shipping bar */}
      <div className={styles.shippingBar}>
        <p>🚚 Заказы от <strong>10 000 ₽</strong> — бесплатно</p>
        <div className={styles.shipDiv} />
        <p>💳 Оплата картой <strong>МИР</strong></p>
        <div className={styles.shipDiv} />
        <p>📦 По всей <strong>России</strong></p>
      </div>

      {/* Catalog */}
      <main className={styles.section} id="catalog">
        <div className={styles.sHeader}>
          <h2>{activeCategory === 'Все' ? 'Все товары' : activeCategory}</h2>
          <p>{filtered.length} {filtered.length === 1 ? 'товар' : filtered.length < 5 ? 'товара' : 'товаров'}</p>
          <div className={styles.dot} />
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛍️</div>
            <p>В этой категории пока нет товаров</p>
          </div>
        ) : (
          <div className={styles.prodGrid}>
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </main>

      {/* Delivery */}
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className={styles.sHeader}><h2>Доставка</h2><p>Отправляем по всей России</p><div className={styles.dot} /></div>
        <div className={styles.delCards}>
          <div className={styles.delCard}><div className={styles.di}>📦</div><h4>СДЭК</h4><p>Пункт выдачи или курьер до двери.</p><div className={styles.cost}>от 290 ₽ · 2–5 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>✉️</div><h4>Почта России</h4><p>Любой населённый пункт.</p><div className={styles.cost}>от 250 ₽ · 5–10 дней</div></div>
          <div className={styles.delCard}><div className={styles.di}>⚡</div><h4>Курьер</h4><p>Москва и СПб — в день заказа.</p><div className={styles.cost}>от 350 ₽ · 1 день</div></div>
        </div>
        <div className={styles.delNote}>💳 Оплата картой <strong>МИР</strong> · 🚚 Бесплатно от <strong>10 000 ₽</strong></div>
      </section>

      {/* Trust */}
      <section className={styles.trust}>
        <div className={styles.trustGrid}>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🌹</div><h4>Будуарный стиль</h4><p>Изысканное бельё для женщин, которые ценят красоту</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>📸</div><h4>Студийные фото</h4><p>Каждый товар в деталях — несколько ракурсов</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>💳</div><h4>Безопасная оплата</h4><p>Карта МИР, оплата после оформления</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🎁</div><h4>Бережная упаковка</h4><p>Аккуратная упаковка для хрупких тканей</p></div>
        </div>
      </section>

      {/* Social */}
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

      {/* Newsletter */}
      <section className={styles.nl}>
        <h2>Будьте в курсе</h2>
        <p>Подпишитесь на новинки и получите скидку на первый заказ</p>
        <div className={styles.nlForm}><input type="email" placeholder="Ваш e-mail" /><button>Подписаться</button></div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.fGrid}>
          <div className={styles.fBrand}>
            <span className={styles.fLm}>Bellissimo</span>
            <span className={styles.fLs}>Lingerie</span>
            <p>Интернет-магазин будуарного нижнего белья. Доставка по всей России.</p>
          </div>
          <div>
            <h5>Каталог</h5>
            <ul>{categories.filter(c => c !== 'Все').map(c => <li key={c}><a href="#" onClick={() => setActiveCategory(c)}>{c}</a></li>)}</ul>
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

      {/* Cart sidebar */}
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
    </>
  )
}

function ProductCard({ product, onAddToCart }) {
  const [imgIdx, setImgIdx] = useState(0)
  const imgs = product.images || []

  return (
    <div className={styles.prodCard}>
      <div className={styles.prodImg}
        onMouseEnter={() => imgs.length > 1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}>
        {imgs[imgIdx] && <img src={imgs[imgIdx]} alt={product.name} loading="lazy" />}
        {product.is_new && <span className={styles.tagNew}>New</span>}
        <button className={styles.addBar} onClick={() => onAddToCart(product)}>+ В корзину</button>
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
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
    return { props: { initialProducts: data || [] } }
  } catch {
    return { props: { initialProducts: [] } }
  }
}

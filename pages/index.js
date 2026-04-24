import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import styles from '../styles/Home.module.css'

export default function Home({ initialProducts, settings, featuredProducts }) {
  const [products] = useState(initialProducts || [])
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все')
  const [lightbox, setLightbox] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sizeChartOpen, setSizeChartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', comment: '' })
  const [formErrors, setFormErrors] = useState({})
  const [orderSent, setOrderSent] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [lbQty, setLbQty] = useState(1)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState('post') // post | pickup

  const FREE_DELIVERY = settings?.free_delivery_amount || 10000
  const customCats = settings?.custom_categories || []
  const baseFallback = ['Комплекты','Бюстгальтеры','Корсеты','Пижамы','Боди','Ночные сорочки','Халаты','Трусики','Чулки','Пояса для чулок','Купальники']
  const categories = ['Все', ...(customCats.length > 0 ? customCats : baseFallback), 'Скидки']
  const searchResults = searchQuery.length > 1
    ? products.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    : []
  const filtered = activeCategory === 'Все' ? products 
    : activeCategory === 'Скидки' ? products.filter(p => p.old_price && p.old_price > p.price)
    : products.filter(p => p.category === activeCategory)
  const cartTotal = cart.reduce((s,x) => s + x.price * x.qty, 0)
  const cartCount = cart.reduce((s,x) => s + x.qty, 0)
  const deliveryCost = deliveryMethod === 'pickup' ? 0 : (cartTotal >= FREE_DELIVERY ? 0 : 350)
  const promoBaseAmount = promoResult && !promoResult.error
    ? (promoResult.categories && promoResult.categories.length > 0
        ? cart.filter(x => promoResult.categories.includes(x.category)).reduce((s,x) => s + x.price * x.qty, 0)
        : cartTotal)
    : 0
  const promoDiscount = promoResult && !promoResult.error
    ? (promoResult.discount_type === 'percent'
        ? Math.round(promoBaseAmount * promoResult.discount_value / 100)
        : Math.min(promoResult.discount_value, promoBaseAmount))
    : 0
  const orderTotal = cartTotal - promoDiscount + deliveryCost
  const leftForFree = FREE_DELIVERY - cartTotal

  const heroImg = settings?.hero_image || products[0]?.images?.[0] || ''
  const heroTitle = settings?.hero_title || 'Красота, которая ближе к телу'
  const heroSubtitle = settings?.hero_subtitle || 'Будуарное нижнее бельё для особых моментов'

  const lbImgs = lightbox?.product.images || []
  const lbHasVideo = !!lightbox?.product.video_url
  const lbTotal = lbImgs.length + (lbHasVideo ? 1 : 0)
  const lbIdx = lightbox?.mediaIdx || 0
  const lbIsVideo = lbHasVideo && lbIdx >= lbImgs.length
  const lbUrl = lbIsVideo ? lightbox?.product.video_url : (lbImgs[lbIdx] || lbImgs[0])

  function showToast(text, type = 'default') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 2500)
  }

  function selectCategory(cat) {
    setActiveCategory(cat)
    setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function addToCart(product, size, qty = 1) {
    const key = product.id + (size ? '_' + size : '')
    setCart(prev => {
      const ex = prev.find(x => x.key === key)
      if (ex) return prev.map(x => x.key === key ? {...x, qty: x.qty + qty} : x)
      return [...prev, {...product, key, selectedSize: size || null, qty}]
    })
    showToast(`«${product.name}» добавлен в корзину`, 'success')
    setCartOpen(true)
  }

  function toggleWishlist(productId) {
    setWishlist(prev => {
      if (prev.includes(productId)) {
        showToast('Удалено из избранного')
        return prev.filter(id => id !== productId)
      } else {
        showToast('❤️ Добавлено в избранное')
        return [...prev, productId]
      }
    })
  }

  function removeFromCart(key) { setCart(prev => prev.filter(x => x.key !== key)) }

  function changeQty(key, delta) {
    setCart(prev => prev.map(x => {
      if (x.key !== key) return x
      const q = x.qty + delta
      return q < 1 ? null : {...x, qty: q}
    }).filter(Boolean))
  }

  function openLightbox(product) {
    setLbQty(1)
    setLightbox({ product, mediaIdx: 0, selectedSize: product.sizes?.[0] || null })
    document.body.style.overflow = 'hidden'
  }

  function closeLightbox() { setLightbox(null); document.body.style.overflow = '' }

  function nextMedia() {
    if (!lightbox || lbTotal <= 1) return
    setLightbox(l => ({...l, mediaIdx: (l.mediaIdx + 1) % lbTotal}))
  }

  function prevMedia() {
    if (!lightbox || lbTotal <= 1) return
    setLightbox(l => ({...l, mediaIdx: (l.mediaIdx - 1 + lbTotal) % lbTotal}))
  }

  async function applyPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoResult(null)
    try {
      const code = promoCode.trim().toUpperCase()
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .single()

      if (error || !data) {
        setPromoResult({ error: `Промокод «${code}» не существует. Проверьте правильность написания.` })
      } else if (!data.active) {
        setPromoResult({ error: `Промокод «${code}» отключён и не может быть использован.` })
      } else if (data.starts_at && new Date(data.starts_at) > new Date()) {
        const startDate = new Date(data.starts_at).toLocaleDateString('ru', {day:'numeric',month:'long',year:'numeric'})
        setPromoResult({ error: `Промокод «${code}» ещё не действует. Он начнёт работать ${startDate}.` })
      } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
        const expDate = new Date(data.expires_at).toLocaleDateString('ru', {day:'numeric',month:'long',year:'numeric'})
        setPromoResult({ error: `Срок действия промокода «${code}» истёк ${expDate}.` })
      } else if (data.max_uses > 0 && (data.used_count || 0) >= data.max_uses) {
        setPromoResult({ error: `Промокод «${code}» уже использован максимальное количество раз (${data.max_uses}).` })
      } else if (data.min_order > 0 && cartTotal < data.min_order) {
        setPromoResult({ error: `Промокод «${code}» действует при заказе от ${data.min_order.toLocaleString('ru')} ₽. Добавьте ещё товаров на ${(data.min_order - cartTotal).toLocaleString('ru')} ₽.` })
      } else if (data.categories && data.categories.length > 0) {
        const hasValidItems = cart.some(item => data.categories.includes(item.category))
        if (!hasValidItems) {
          setPromoResult({ error: `Промокод «${code}» действует только на: ${data.categories.join(', ')}.` })
        } else {
          setPromoResult({ discount_type: data.discount_type, discount_value: data.discount_value, code: data.code, id: data.id, categories: data.categories })
        }
      } else {
        setPromoResult({ discount_type: data.discount_type, discount_value: data.discount_value, code: data.code, id: data.id, categories: [] })
      }
    } catch(e) {
      setPromoResult({ error: 'Не удалось проверить промокод. Попробуйте позже.' })
    }
    setPromoLoading(false)
  }

  function sendWhatsApp() {
    const items = cart.map(x => `• ${x.name}${x.selectedSize ? ` (${x.selectedSize})` : ''} × ${x.qty} = ${(x.price * x.qty).toLocaleString('ru')} ₽`).join('\n')
    const msg = `Здравствуйте! Хочу заказать:\n${items}\n\nИтого: ${cartTotal.toLocaleString('ru')} ₽\nДоставка: ${deliveryCost === 0 ? 'бесплатно' : '~' + deliveryCost + ' ₽'}`
    window.open(`https://wa.me/79114589339?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function submitOrder(e) {
    e.preventDefault()
    const errors = validateForm()
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    setFormErrors({})
    const items = cart.map(x => `• ${x.name}${x.selectedSize ? ` (${x.selectedSize})` : ''} × ${x.qty} — ${(x.price*x.qty).toLocaleString('ru')} ₽`).join('\n')
    const promoLine = promoResult && !promoResult.error ? `\nПромокод: ${promoResult.code} (-${promoDiscount.toLocaleString('ru')} ₽)` : ''
    const deliveryLine = deliveryMethod === 'pickup' ? 'Самовывоз в Калининграде (бесплатно)' : (deliveryCost === 0 ? 'Доставка бесплатно' : `~${deliveryCost} ₽`)
    const msg = `🛍 НОВЫЙ ЗАКАЗ\n\nПокупатель: ${orderForm.name}\nТелефон: ${orderForm.phone}\nДоставка: ${deliveryLine}\nАдрес: ${deliveryMethod === 'pickup' ? 'Самовывоз' : orderForm.address}\n\nТовары:\n${items}\n\nТовары: ${cartTotal.toLocaleString('ru')} ₽${promoLine}\nДоставка: ${deliveryLine}\nИТОГО: ${orderTotal.toLocaleString('ru')} ₽\n\nКомментарий: ${orderForm.comment || '—'}`
    window.open(`https://wa.me/79114589339?text=${encodeURIComponent(msg)}`, '_blank')
    setOrderSent(true)
    setTimeout(() => { setOrderSent(false); setCheckoutOpen(false); setCart([]) }, 4000)
  }

  // ── МАСКА ТЕЛЕФОНА ── //
  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    let d = digits
    if (d.startsWith('8')) d = '7' + d.slice(1)
    if (d.startsWith('7') && d.length > 1) {
      let result = '+7'
      if (d.length > 1) result += ' (' + d.slice(1, 4)
      if (d.length >= 4) result += ') ' + d.slice(4, 7)
      if (d.length >= 7) result += '-' + d.slice(7, 9)
      if (d.length >= 9) result += '-' + d.slice(9, 11)
      return result
    }
    return value.length ? '+7' : ''
  }

  function handlePhoneChange(e) {
    const raw = e.target.value
    const formatted = formatPhone(raw)
    setOrderForm(v => ({ ...v, phone: formatted }))
    setFormErrors(err => ({ ...err, phone: '' }))
  }

  function validateForm() {
    const errors = {}
    if (!orderForm.name.trim() || orderForm.name.trim().length < 2) {
      errors.name = 'Введите ваше имя (минимум 2 символа)'
    }
    const digits = orderForm.phone.replace(/\D/g, '')
    if (digits.length !== 11) {
      errors.phone = 'Введите полный номер телефона: +7 (XXX) XXX-XX-XX'
    }
    if (deliveryMethod === 'post' && (!orderForm.address.trim() || orderForm.address.trim().length < 5)) {
      errors.address = 'Введите город и адрес доставки'
    }
    return errors
  }

  // ── ОПЛАТА ЧЕРЕЗ ЮКАССУ ── //
  async function handlePayment() {
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderForm.name,
          customerPhone: orderForm.phone,
          customerEmail: orderForm.email || '',
          customerAddress: deliveryMethod === 'pickup' ? 'Самовывоз в Калининграде' : orderForm.address,
          items: cart.map(x => ({
            name: x.name,
            category: x.category,
            size: x.selectedSize,
            qty: x.qty,
            price: x.price
          })),
          totalAmount: orderTotal,
          promoCode: promoResult && !promoResult.error ? promoResult.code : null,
          discountAmount: promoDiscount
        })
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        showToast('❌ Ошибка оплаты: ' + (data.error || 'Попробуйте позже'), 'error')
      }
    } catch (e) {
      showToast('❌ Ошибка соединения. Попробуйте позже.', 'error')
    }
    setPaymentLoading(false)
  }

  // SVG иконки
  const TgIcon = ({size=20}) => <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.281c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/></svg>
  const VkIcon = ({size=20}) => <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.503s1.954 4.76 4.355 7.17C9.77 16.17 12.17 16 12.17 16h1.797a.61.61 0 0 0 .61-.61v-1.03a.61.61 0 0 1 1.03-.443l2.4 2.303a1.123 1.123 0 0 0 .773.307h2.604a.508.508 0 0 0 .48-.503 12.993 12.993 0 0 0-1.88-3.865.073.073 0 0 1 .005-.085A26.974 26.974 0 0 0 22 7.49a.508.508 0 0 0-.453-.49z"/></svg>
  const InstaIcon = ({size=20}) => <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  const WaIcon = ({size=20}) => <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.103 1.516 5.835L0 24l6.318-1.488A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0Zm6.23 16.428c-.262.737-1.536 1.408-2.1 1.46-.569.055-1.104.273-3.71-.773-3.143-1.266-5.155-4.46-5.308-4.67-.152-.21-1.244-1.658-1.244-3.161s.787-2.24 1.066-2.548c.278-.306.608-.383.811-.383.202 0 .405.002.582.01.187.01.438-.07.686.524.256.614.873 2.118.95 2.271.076.153.127.333.025.538-.103.205-.154.333-.305.513-.152.18-.32.402-.457.54-.152.153-.31.319-.133.625.177.306.784 1.292 1.683 2.092 1.155 1.03 2.13 1.347 2.436 1.5.305.152.484.127.662-.076.178-.204.762-.89 1.065-1.194.231-.232.403-.186.684-.07.28.116 1.772.836 2.076.988.305.153.508.23.583.355.077.127.077.737-.184 1.474Z"/></svg>

  function discount(p) {
    if (!p.old_price || p.old_price <= p.price) return 0
    return Math.round((1 - p.price / p.old_price) * 100)
  }

  return (
    <>
      <Head>
        <title>Bellissimo Lingerie — Нижнее бельё в Калининграде, доставка по России</title>
        <meta name="description" content="Интернет-магазин будуарного нижнего белья Bellissimo в Калининграде. Комплекты, корсеты, пижамы, бюстгальтеры, купальники, халаты, ночные сорочки. Быстрая доставка по всей России от 350 ₽. Самовывоз бесплатно. Оплата картой МИР онлайн." />
        <meta name="keywords" content="нижнее бельё Калининград, купить нижнее бельё, будуарное бельё, корсет купить Калининград, пижамы Калининград, комплект нижнего белья, красивое нижнее бельё, кружевное бельё, купальники Калининград, халаты женские Калининград, ночные сорочки купить, бельё с доставкой, нижнее бельё онлайн, интернет магазин белья Калининград, бельё недорого, bellissimo lingerie, бюстгальтеры Калининград, трусики женские, чулки Калининград, пояс для чулок, боди женское, корсет кружевной, пижама шёлковая, халат женский, сорочка ночная, нижнее бельё доставка Россия, красивое бельё подарок, бельё для медового месяца, сексуальное нижнее бельё, элитное нижнее бельё, премиальное бельё, бельё оптом Калининград, женское бельё купить онлайн, интернет магазин нижнего белья, доставка белья по России, нижнее бельё недорого с доставкой" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Bellissimo Lingerie" />
        <meta name="geo.region" content="RU-KGD" />
        <meta name="geo.placename" content="Калининград" />
        <meta name="geo.position" content="54.717891;20.502663" />
        <meta name="ICBM" content="54.717891, 20.502663" />
        <meta property="og:title" content="Bellissimo Lingerie — Нижнее бельё с доставкой по России" />
        <meta property="og:description" content="Будуарное нижнее бельё — комплекты, корсеты, пижамы, купальники. Доставка по всей России. Самовывоз в Калининграде бесплатно." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.bellissimolingerie.ru" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:site_name" content="Bellissimo Lingerie" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bellissimo Lingerie — Нижнее бельё" />
        <meta name="twitter:description" content="Будуарное нижнее бельё с доставкой по России" />
        <link rel="canonical" href="https://www.bellissimolingerie.ru" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          "name": "Bellissimo Lingerie",
          "description": "Интернет-магазин будуарного нижнего белья в Калининграде",
          "url": "https://www.bellissimolingerie.ru",
          "telephone": "+79114589339",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Калининград",
            "addressCountry": "RU"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 54.717891,
            "longitude": 20.502663
          },
          "openingHours": "Mo-Su 09:00-21:00",
          "priceRange": "₽₽",
          "servesCuisine": "Нижнее бельё, lingerie"
        })}</script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Toast */}
      {toast && <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : ''}`}>{toast.text}</div>}

      {/* Плавающий виджет соцсетей СЛЕВА */}
      <div className={styles.socialFloat}>
        <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.sfBtn} title="Telegram"><TgIcon /></a>
        <a href="https://vk.ru/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.sfBtn} title="ВКонтакте"><VkIcon /></a>
        <a href="https://instagram.com/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.sfBtn} title="Instagram"><InstaIcon /></a>
        <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={styles.sfBtn} title="WhatsApp"><WaIcon /></a>
      </div>

      <div className={styles.announce}>
        🎁 Бесплатная доставка при заказе от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong> по всей России
      </div>

      {/* ── ШАПКА ── */}
      <header className={styles.header}>
        <div className={styles.hTop}>
          <div className={styles.hLeft}>
            <button className={styles.mobileToggle} onClick={() => setMenuOpen(true)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="6" x2="19" y2="6"/><line x1="3" y1="11" x2="19" y2="11"/><line x1="3" y1="16" x2="19" y2="16"/>
              </svg>
            </button>
            <div className={styles.hSocials}>
              <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.hSocBtn} title="Telegram"><TgIcon size={18}/></a>
              <a href="https://vk.ru/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.hSocBtn} title="ВКонтакте"><VkIcon size={18}/></a>
              <a href="https://instagram.com/bellissimolingerie" target="_blank" rel="noreferrer" className={styles.hSocBtn} title="Instagram"><InstaIcon size={18}/></a>
              <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={styles.hSocBtn} title="WhatsApp"><WaIcon size={18}/></a>
            </div>
          </div>

          <a href="/" className={styles.logo}>
            <span className={styles.logoMain}>Bellissimo</span>
            <span className={styles.logoSub}>Lingerie</span>
          </a>

          <div className={styles.hActions}>
            <button className={styles.hBtn} onClick={() => setSearchOpen(s => !s)} title="Поиск">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="19" height="19">
                <circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className={styles.hBtn} onClick={() => setSizeChartOpen(true)} title="Размерная сетка">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="19" height="19">
                <path d="M3 7h18M3 12h18M3 17h18M9 4v3M15 4v3M9 17v3M15 17v3" strokeLinecap="round"/>
              </svg>
            </button>
            <button className={styles.hBtn} onClick={() => setWishlistOpen(true)} title="Избранное" style={{position:'relative'}}>
              <svg viewBox="0 0 24 24" fill={wishlist.length > 0 ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.8" width="19" height="19">
                <path d="M12 21C12 21 4 15 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4S13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 15 12 21 12 21Z"/>
              </svg>
              {wishlist.length > 0 && <span className={styles.badge}>{wishlist.length}</span>}
            </button>
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)} title="Корзина">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="19" height="19">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className={styles.searchBar}>
            <div className={styles.searchInner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" style={{flexShrink:0,color:'var(--muted)'}}>
                <circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5" strokeLinecap="round"/>
              </svg>
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по товарам..." className={styles.searchInput} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:18}}>×</button>}
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:13,whiteSpace:'nowrap'}}>Закрыть</button>
            </div>
            {searchQuery.length > 1 && (
              <div className={styles.searchResults}>
                {searchResults.length === 0 ? (
                  <div style={{padding:'16px 20px',color:'var(--muted)',fontSize:14}}>Ничего не найдено</div>
                ) : searchResults.map(p => (
                  <div key={p.id} className={styles.searchItem} onClick={() => { openLightbox(p); setSearchOpen(false); setSearchQuery('') }}>
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} />}
                    <div>
                      <div style={{fontSize:14,fontFamily:'Georgia,serif',color:'var(--text)'}}>{p.name}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{p.category} · {p.price?.toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.nav}>
          <div className={styles.navInner}>
            {categories.map(cat => (
              <button key={cat}
                className={`${styles.navLink} ${activeCategory===cat?styles.active:''} ${cat==='Скидки'?styles.navLinkSale:''}`}
                onClick={() => selectCategory(cat)}>{cat}</button>
            ))}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
          {categories.map(cat => (
            <button key={cat} className={styles.mobileLink} onClick={() => { selectCategory(cat); setMenuOpen(false) }}>{cat}</button>
          ))}
          <div style={{marginTop:'auto',paddingTop:24,borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:10}}>
            <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'#f0faf3',borderRadius:10,textDecoration:'none',color:'#2d7a47',fontWeight:600,fontSize:14}}>
              💬 WhatsApp
            </a>
            <button onClick={() => { setSizeChartOpen(true); setMenuOpen(false) }}
              style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'var(--bg2)',borderRadius:10,border:'none',cursor:'pointer',fontSize:14,textAlign:'left'}}>
              📏 Размерная сетка
            </button>
          </div>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroTag}>Коллекция 2026</div>
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

      {featuredProducts && featuredProducts.length > 0 && (
        <section className={styles.tickerSection}>
          <div className={styles.tickerSectionHeader}>
            <div className={styles.tickerSectionTitle}>✨ Новинки</div>
            <div className={styles.tickerSectionSub}>Нажмите на товар чтобы посмотреть подробнее</div>
          </div>
          <div className={styles.tickerWrap}>
            <div className={styles.tickerTrack}>
              {[...featuredProducts, ...featuredProducts, ...featuredProducts].map((product, idx) => (
                <div key={idx} className={styles.tickerItem} onClick={() => openLightbox(product)}>
                  <div className={styles.tickerImg}>
                    {product.images?.[0] && <img src={product.images[0]} alt={product.name} loading="lazy" />}
                    {product.is_new && <span className={styles.tagNew} style={{position:'absolute',top:10,left:10,zIndex:2}}>New</span>}
                  </div>
                  <div className={styles.tickerInfo}>
                    <div className={styles.tickerName}>{product.name}</div>
                    <div className={styles.tickerPrice}>{product.price?.toLocaleString('ru')} ₽</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className={styles.shippingBar}>
        <p>🚚 Заказы от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong> — бесплатно</p>
        <div className={styles.shipDiv}/>
        <p>💳 Оплата картой <strong>МИР</strong></p>
        <div className={styles.shipDiv}/>
        <p>📦 По всей <strong>России</strong></p>
        <div className={styles.shipDiv}/>
        <p>🔒 Без <strong>возврата</strong></p>
      </div>

      <main className={styles.section} id="catalog">
        <div className={styles.sHeader}>
          <h2>{activeCategory==='Все'?'Все товары':activeCategory}</h2>
          <p>{filtered.length} {filtered.length===1?'товар':filtered.length<5?'товара':'товаров'}</p>
          <div className={styles.dot}/>
        </div>
        <div className={styles.catFilter}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`${styles.catBtn} ${activeCategory===cat?styles.catBtnActive:''} ${cat==='Скидки'&&activeCategory!==cat?styles.catBtnSale:''}`}>{cat}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}><div className={styles.emptyIcon}>🛍️</div><p>В этой категории пока нет товаров</p></div>
        ) : (
          <div className={styles.prodGrid}>
            {filtered.map(product => (
              <ProductCard key={product.id} product={product}
                onOpen={openLightbox}
                isWishlisted={wishlist.includes(product.id)}
                onWishlist={() => toggleWishlist(product.id)}
                discountPct={discount(product)}
              />
            ))}
          </div>
        )}
      </main>

      <section className={styles.section} style={{paddingTop:0}}>
        <div className={styles.sHeader}><h2>Доставка и оплата</h2><p>Отправляем по всей России</p><div className={styles.dot}/></div>
        <div className={styles.delCards}>
          <div className={styles.delCard}><div className={styles.di}>✉️</div><h4>Почта России</h4><p>Стандартная доставка в любую точку России.</p><div className={styles.cost}>{settings?.delivery_cdek || '590 ₽ · 5–14 дней'}</div></div>
          <div className={styles.delCard}><div className={styles.di}>⚡</div><h4>Срочная доставка</h4><p>Приоритетная отправка — быстрее обычного.</p><div className={styles.cost}>{settings?.delivery_post || '1 100 ₽ · 2–5 дней'}</div></div>
          <div className={styles.delCard}><div className={styles.di}>🏪</div><h4>Самовывоз в Калининграде</h4><p>Бесплатно — заберите заказ из нашего магазина.</p><div className={styles.cost}>{settings?.delivery_courier || 'Бесплатно'}</div></div>
        </div>
        <div className={styles.delNote}>💳 Оплата картой <strong>МИР</strong> · 🚚 Бесплатно от <strong>{FREE_DELIVERY.toLocaleString('ru')} ₽</strong></div>
        {settings?.return_policy && (
          <div style={{textAlign:'center',marginTop:12,padding:'12px 20px',background:'#fef8f5',borderRadius:10,fontSize:13,color:'var(--muted)',border:'1px solid #ede4dc'}}>
            🔒 {settings.return_policy}
          </div>
        )}
      </section>

      <section className={styles.trust}>
        <div className={styles.trustGrid}>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🌹</div><h4>Будуарный стиль</h4><p>Изысканное бельё для особых моментов</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>📸</div><h4>Студийные фото</h4><p>Каждый товар — несколько ракурсов и видео</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🔒</div><h4>Без возврата</h4><p>Нижнее бельё не подлежит обмену и возврату по санитарным нормам</p></div>
          <div className={styles.trustItem}><div className={styles.trustIcon}>🎁</div><h4>Бережная упаковка</h4><p>Аккуратная упаковка для хрупких тканей</p></div>
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.mapInner}>
          <div className={styles.mapText}>
            <div className={styles.sHeader} style={{textAlign:'left',marginBottom:20}}>
              <h2>Самовывоз в Калининграде</h2>
              <p>Заберите заказ бесплатно из нашего магазина</p>
              <div className={styles.dot} style={{margin:'12px 0 0'}}/>
            </div>
            <div className={styles.mapDetails}>
              <div className={styles.mapDetail}><span>📍</span><div><strong>Адрес</strong><p>Калининград, магазин «Европа»</p></div></div>
              <div className={styles.mapDetail}><span>🏪</span><div><strong>Самовывоз</strong><p>Бесплатно · по договорённости</p></div></div>
              <div className={styles.mapDetail}><span>💬</span><div><strong>Уточнить время</strong><p>Напишите нам в WhatsApp перед визитом</p></div></div>
            </div>
            <a href="https://wa.me/79114589339?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21+%D0%A5%D0%BE%D1%87%D1%83+%D1%83%D1%82%D0%BE%D1%87%D0%BD%D0%B8%D1%82%D1%8C+%D0%B2%D1%80%D0%B5%D0%BC%D1%8F+%D1%81%D0%B0%D0%BC%D0%BE%D0%B2%D1%8B%D0%B2%D0%BE%D0%B7%D0%B0"
              target="_blank" rel="noreferrer" className={styles.waBtn} style={{marginTop:24,display:'inline-flex'}}>
              💬 Уточнить время самовывоза
            </a>
          </div>
          <div className={styles.mapFrame}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=20.502663%2C54.717891&z=16&pt=20.502663%2C54.717891%2Cpm2rdm&org=1706976737"
              width="100%" height="100%" frameBorder="0" allowFullScreen
              title="Bellissimo Lingerie на карте"
              style={{borderRadius:'var(--radius)',border:'none'}}
            />
          </div>
        </div>
      </section>

      <section className={styles.waBanner}>
        <div className={styles.waInner}>
          <div><h3>Нужна помощь с выбором?</h3><p>Подберём размер, цвет и комплект. Ответим за 5 минут!</p></div>
          <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={styles.waBtn}>💬 Написать в WhatsApp</a>
        </div>
      </section>

      <section className={styles.socialStrip}>
        <h3>Мы в социальных сетях</h3>
        <p>Следите за новинками и акциями</p>
        <div className={styles.socialIcons}>
          <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" className={`${styles.socBtn} ${styles.socTg}`}><TgIcon size={18}/>Telegram</a>
          <a href="https://vk.ru/bellissimolingerie" target="_blank" rel="noreferrer" className={`${styles.socBtn} ${styles.socVk}`}><VkIcon size={18}/>ВКонтакте</a>
          <a href="https://instagram.com/bellissimolingerie" target="_blank" rel="noreferrer" className={`${styles.socBtn} ${styles.socInst}`}><InstaIcon size={18}/>Instagram</a>
          <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" className={`${styles.socBtn} ${styles.socWa}`}><WaIcon size={18}/>WhatsApp</a>
        </div>
      </section>

      <section className={styles.nl}>
        <h2>Будьте в курсе</h2>
        <p>Подпишитесь и получите скидку 10% на первый заказ</p>
        <div className={styles.nlForm}><input type="email" placeholder="Ваш e-mail" /><button>Подписаться</button></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.fGrid}>
          <div className={styles.fBrand}>
            <span className={styles.fLm}>Bellissimo</span>
            <span className={styles.fLs}>Lingerie</span>
            <p>Интернет-магазин будуарного нижнего белья. Доставка по всей России.</p>
            <div className={styles.fSocials}>
              <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" title="Telegram"><TgIcon size={16}/></a>
              <a href="https://vk.ru/bellissimolingerie" target="_blank" rel="noreferrer" title="ВКонтакте"><VkIcon size={16}/></a>
              <a href="https://instagram.com/bellissimolingerie" target="_blank" rel="noreferrer" title="Instagram"><InstaIcon size={16}/></a>
              <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" title="WhatsApp"><WaIcon size={16}/></a>
            </div>
          </div>
          <div>
            <h5>Каталог</h5>
            <ul>{categories.filter(c=>c!=='Все').map(c=><li key={c}><a href="#" onClick={e=>{e.preventDefault();selectCategory(c)}}>{c}</a></li>)}</ul>
          </div>
          <div>
            <h5>Покупателям</h5>
            <ul>
              <li><a href="#" onClick={e=>{e.preventDefault();setSizeChartOpen(true)}}>Размерная сетка</a></li>
              <li><a href="#">Доставка и оплата</a></li>
              <li><a href="/rekvizity">Реквизиты</a></li>
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
          <span>© 2026 Bellissimo Lingerie · ИНН 390503901110 · ОГРНИП 324390000042780</span>
          <div className={styles.fPay}><span>МИР</span><span>СБП</span></div>
        </div>
      </footer>

      {/* КОРЗИНА */}
      {cartOpen && <div className={styles.cartOverlay} onClick={() => setCartOpen(false)} />}
      <div className={`${styles.cartSidebar} ${cartOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <h3>Корзина {cartCount > 0 && <span style={{fontSize:13,color:'var(--muted)',fontWeight:400}}>· {cartCount} шт</span>}</h3>
          <button onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}><div>🛍️</div><p>Корзина пуста</p>
              <button onClick={() => setCartOpen(false)} style={{marginTop:12,padding:'8px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13}}>Перейти в каталог</button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.key} className={styles.cartItem}>
                  {item.images?.[0] && <img src={item.images[0]} alt={item.name} />}
                  <div className={styles.cartItemInfo}>
                    <div className={styles.cartItemName}>{item.name}</div>
                    <div className={styles.cartItemCat}>{item.category}{item.selectedSize && <span style={{marginLeft:6,padding:'2px 6px',background:'var(--bg2)',borderRadius:4,fontSize:10,fontWeight:600}}>{item.selectedSize}</span>}</div>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',borderRadius:6,overflow:'hidden'}}>
                        <button onClick={() => changeQty(item.key,-1)} style={{width:28,height:28,background:'none',border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                        <span style={{width:28,textAlign:'center',fontSize:13,fontWeight:600}}>{item.qty}</span>
                        <button onClick={() => changeQty(item.key,+1)} style={{width:28,height:28,background:'none',border:'none',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      </div>
                      <div className={styles.cartItemPrice}>{(item.price*item.qty).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  <button className={styles.cartRemove} onClick={() => removeFromCart(item.key)}>×</button>
                </div>
              ))}
              {leftForFree > 0 ? (
                <div style={{padding:'12px 14px',background:'var(--bg2)',borderRadius:10,margin:'8px 0'}}>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:6}}>До бесплатной доставки ещё <strong style={{color:'var(--accent-dark)'}}>{leftForFree.toLocaleString('ru')} ₽</strong></div>
                  <div style={{height:4,background:'var(--border)',borderRadius:2}}><div style={{height:'100%',background:'var(--accent)',borderRadius:2,width:`${Math.min(100,(cartTotal/FREE_DELIVERY)*100)}%`,transition:'width .4s'}}/></div>
                </div>
              ) : <div style={{padding:'10px 14px',background:'#edf7ed',borderRadius:10,fontSize:13,color:'#3a7a3a',fontWeight:600,margin:'8px 0'}}>🎉 Бесплатная доставка включена!</div>}
            </>
          )}
        </div>
        {cart.length > 0 && (
          <div className={styles.cartFooter}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13,color:'var(--muted)'}}><span>Товары:</span><span>{cartTotal.toLocaleString('ru')} ₽</span></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:13,color:'var(--muted)'}}><span>Доставка:</span><span style={{color:deliveryCost===0?'#3a7a3a':'inherit',fontWeight:deliveryCost===0?700:'inherit'}}>{deliveryCost===0?'🎁 Бесплатно':`~${deliveryCost} ₽`}</span></div>
            <div className={styles.cartTotal}><span>Итого:</span><strong>{orderTotal.toLocaleString('ru')} ₽</strong></div>
            <button className={styles.orderBtn} onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>Оформить заказ →</button>
            <button onClick={sendWhatsApp} style={{width:'100%',padding:'11px',background:'#25d366',color:'#fff',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:600,marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>💬 Заказать через WhatsApp</button>
          </div>
        )}
      </div>

      {/* ОФОРМЛЕНИЕ ЗАКАЗА */}
      {checkoutOpen && (
        <div className={styles.modalOverlay} onClick={() => setCheckoutOpen(false)}>
          <div className={styles.modalBox} onClick={e=>e.stopPropagation()}>
            <button onClick={() => setCheckoutOpen(false)} className={styles.modalClose}>✕</button>
            {orderSent ? (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:64,marginBottom:16}}>✅</div>
                <h3 style={{fontFamily:'Georgia,serif',fontSize:24,fontWeight:300,marginBottom:8}}>Заказ отправлен!</h3>
                <p style={{color:'var(--muted)',fontSize:14}}>Менеджер свяжется в WhatsApp в течение 5 минут</p>
              </div>
            ) : (
              <>
                <h3 style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:300,marginBottom:4}}>Оформление заказа</h3>
                <p style={{fontSize:13,color:'var(--muted)',marginBottom:24}}>Заполните форму и выберите способ оплаты</p>
                <form onSubmit={submitOrder} style={{display:'flex',flexDirection:'column',gap:14}}>

                  {/* Имя */}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Ваше имя *</label>
                    <input
                      type="text"
                      required
                      value={orderForm.name}
                      onChange={e => { setOrderForm(v=>({...v,name:e.target.value})); setFormErrors(err=>({...err,name:''})) }}
                      placeholder="Анна Иванова"
                      style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${formErrors.name?'#fca5a5':'var(--border)'}`,borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',background:formErrors.name?'#fff8f8':'#fff'}}
                    />
                    {formErrors.name && <div style={{fontSize:12,color:'#c45c5c',marginTop:4}}>⚠️ {formErrors.name}</div>}
                  </div>

                  {/* Телефон с маской */}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Телефон *</label>
                    <input
                      type="tel"
                      required
                      value={orderForm.phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (999) 123-45-67"
                      style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${formErrors.phone?'#fca5a5':'var(--border)'}`,borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',background:formErrors.phone?'#fff8f8':'#fff'}}
                    />
                    {formErrors.phone
                      ? <div style={{fontSize:12,color:'#c45c5c',marginTop:4}}>⚠️ {formErrors.phone}</div>
                      : <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Формат: +7 (999) 123-45-67</div>
                    }
                  </div>

                  {/* Способ доставки */}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Способ доставки *</label>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {[
                        ['post', '🚚', 'Доставка по России', deliveryCost > 0 && deliveryMethod==='post' ? `~${350} ₽` : '🎁 Бесплатно', 'Почта РФ · 5–14 дней'],
                        ['pickup', '🏪', 'Самовывоз в Калининграде', 'Бесплатно', 'По договорённости'],
                      ].map(([val, icon, title, price, sub]) => (
                        <label key={val} onClick={() => setDeliveryMethod(val)}
                          style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',border:`2px solid ${deliveryMethod===val?'var(--accent)':'var(--border)'}`,borderRadius:10,cursor:'pointer',background:deliveryMethod===val?'#fdf3f5':'#fff',transition:'all .2s'}}>
                          <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${deliveryMethod===val?'var(--accent)':'#ccc'}`,background:deliveryMethod===val?'var(--accent)':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {deliveryMethod===val && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                          </div>
                          <span style={{fontSize:20}}>{icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,fontWeight:600,color:'#3a2f2b'}}>{title}</div>
                            <div style={{fontSize:12,color:'var(--muted)'}}>{sub}</div>
                          </div>
                          <div style={{fontSize:13,fontWeight:700,color:price==='Бесплатно'||price.includes('🎁')?'#3a7a3a':'#3a2f2b',whiteSpace:'nowrap'}}>{price}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Адрес — только для доставки */}
                  {deliveryMethod === 'post' && (
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Город и адрес *</label>
                    <input
                      type="text"
                      required
                      value={orderForm.address}
                      onChange={e => { setOrderForm(v=>({...v,address:e.target.value})); setFormErrors(err=>({...err,address:''})) }}
                      placeholder="Москва, ул. Примерная, д. 1, кв. 5"
                      style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${formErrors.address?'#fca5a5':'var(--border)'}`,borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',background:formErrors.address?'#fff8f8':'#fff'}}
                    />
                    {formErrors.address && <div style={{fontSize:12,color:'#c45c5c',marginTop:4}}>⚠️ {formErrors.address}</div>}
                  </div>
                  )}

                  {/* Комментарий */}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Комментарий</label>
                    <textarea value={orderForm.comment} onChange={e=>setOrderForm(v=>({...v,comment:e.target.value}))} placeholder="Пожелания по доставке, упаковке..." rows={2}
                      style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box'}} />
                  </div>

                  {/* Промокод */}
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:5}}>Промокод</label>
                    <div style={{display:'flex',gap:8}}>
                      <input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Введите промокод" disabled={!!promoResult&&!promoResult.error}
                        style={{flex:1,padding:'10px 14px',border:`1.5px solid ${promoResult?.error?'#fca5a5':promoResult&&!promoResult.error?'#86efac':'var(--border)'}`,borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'monospace',letterSpacing:2}} />
                      {promoResult && !promoResult.error ? (
                        <button type="button" onClick={()=>{setPromoResult(null);setPromoCode('')}}
                          style={{padding:'10px 16px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,cursor:'pointer',fontSize:13,color:'#c45c5c',whiteSpace:'nowrap'}}>
                          Убрать
                        </button>
                      ) : (
                        <button type="button" onClick={applyPromo} disabled={!promoCode||promoLoading}
                          style={{padding:'10px 16px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',opacity:!promoCode?0.5:1}}>
                          {promoLoading?'...':'Применить'}
                        </button>
                      )}
                    </div>
                    {promoResult?.error && <div style={{fontSize:12,color:'#c45c5c',marginTop:5}}>❌ {promoResult.error}</div>}
                    {promoResult&&!promoResult.error && <div style={{fontSize:12,color:'#3a7a3a',marginTop:5}}>✅ Промокод «{promoResult.code}» применён! Скидка {promoResult.discount_value}{promoResult.discount_type==='percent'?'%':' ₽'}</div>}
                  </div>

                  {/* Итого */}
                  <div style={{background:'var(--bg2)',borderRadius:10,padding:'12px 16px',fontSize:13}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>Товары:</span><span>{cartTotal.toLocaleString('ru')} ₽</span></div>
                    {promoDiscount > 0 && <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#3a7a3a'}}>Скидка ({promoResult.code}):</span><span style={{color:'#3a7a3a',fontWeight:600}}>−{promoDiscount.toLocaleString('ru')} ₽</span></div>}
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'var(--muted)'}}>Доставка:</span><span style={{color:deliveryCost===0?'#3a7a3a':'inherit'}}>{deliveryCost===0?'Бесплатно':`~${deliveryCost} ₽`}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15,borderTop:'1px solid var(--border)',paddingTop:8,marginTop:4}}><span>Итого:</span><span style={{color:'var(--accent-dark)'}}>{orderTotal.toLocaleString('ru')} ₽</span></div>
                  </div>

                  {/* ── КНОПКА ОПЛАТЫ ЮКАССА ── */}
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    style={{
                      padding:'14px',
                      background: paymentLoading ? '#ccc' : 'linear-gradient(135deg,#c9748a,#a55570)',
                      color:'#fff',
                      border:'none',
                      borderRadius:10,
                      fontSize:15,
                      cursor: paymentLoading ? 'not-allowed' : 'pointer',
                      fontWeight:700,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8
                    }}
                  >
                    {paymentLoading ? '⏳ Создаём платёж...' : '💳 Оплатить онлайн ' + orderTotal.toLocaleString('ru') + ' ₽'}
                  </button>

                  {/* Разделитель */}
                  <div style={{display:'flex',alignItems:'center',gap:10,color:'var(--muted)',fontSize:12}}>
                    <div style={{flex:1,height:1,background:'var(--border)'}}/>
                    <span>или</span>
                    <div style={{flex:1,height:1,background:'var(--border)'}}/>
                  </div>

                  {/* WhatsApp кнопка */}
                  <button type="submit" style={{padding:'14px',background:'#25d366',color:'#fff',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    💬 Подтвердить через WhatsApp
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* РАЗМЕРНАЯ СЕТКА */}
      {sizeChartOpen && (
        <div className={styles.modalOverlay} style={{zIndex:600}} onClick={() => setSizeChartOpen(false)}>
          <div className={styles.modalBox} style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
            <button onClick={() => setSizeChartOpen(false)} className={styles.modalClose}>✕</button>
            <h3 style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:300,marginBottom:4}}>Размерная сетка</h3>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>Российские стандарты</p>
            <h4 style={{fontSize:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Одежда (пижамы, халаты, сорочки)</h4>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:24}}>
              <thead><tr style={{background:'var(--bg2)'}}>{['Размер','Грудь','Талия','Бёдра'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,borderBottom:'2px solid var(--border)',fontSize:12}}>{h}</th>)}</tr></thead>
              <tbody>{[['XS (42)','80–84','60–64','86–90'],['S (44)','84–88','64–68','90–94'],['M (46)','88–92','68–72','94–98'],['L (48)','92–96','72–76','98–102'],['XL (50)','96–100','76–80','102–106'],['XXL (52)','100–104','80–84','106–110']].map(([s,...v],i)=>(
                <tr key={s} style={{background:i%2===0?'#fff':'var(--bg)'}}><td style={{padding:'8px 12px',fontWeight:700,color:'var(--accent-dark)'}}>{s}</td>{v.map((val,j)=><td key={j} style={{padding:'8px 12px'}}>{val} см</td>)}</tr>
              ))}</tbody>
            </table>
            <h4 style={{fontSize:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Бюстгальтеры</h4>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:20}}>
              <thead><tr style={{background:'var(--bg2)'}}>{['Размер','Объём груди','Под грудью'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,borderBottom:'2px solid var(--border)',fontSize:12}}>{h}</th>)}</tr></thead>
              <tbody>{[['75A','83–85','73–77'],['75B','85–87','73–77'],['80B','88–90','78–82'],['80C','90–92','78–82'],['85B','93–95','83–87'],['85C','95–97','83–87'],['90C','98–100','88–92'],['90D','100–102','88–92']].map(([s,...v],i)=>(
                <tr key={s} style={{background:i%2===0?'#fff':'var(--bg)'}}><td style={{padding:'8px 12px',fontWeight:700,color:'var(--accent-dark)'}}>{s}</td>{v.map((val,j)=><td key={j} style={{padding:'8px 12px'}}>{val} см</td>)}</tr>
              ))}</tbody>
            </table>
            <div style={{padding:'12px',background:'#fff8f0',borderRadius:8,fontSize:12,color:'var(--muted)',lineHeight:1.6}}>💡 Не знаете размер? Напишите в WhatsApp — поможем!</div>
          </div>
        </div>
      )}

      {/* ЛАЙТБОКС */}
      {lightbox !== null && (
        <div className={styles.lbOverlay} onClick={closeLightbox}>
          <div className={styles.lbBox} onClick={e=>e.stopPropagation()}>
            <button className={styles.lbClose} onClick={closeLightbox}>✕</button>
            <div className={styles.lbMain}>
              {lbTotal > 1 && <button className={styles.lbPrev} onClick={e=>{e.stopPropagation();prevMedia()}}>‹</button>}
              {lbIsVideo
                ? <video src={lbUrl} controls autoPlay muted loop className={styles.lbImg} style={{objectFit:'contain',background:'#000'}} />
                : <img src={lbUrl} alt={lightbox.product.name} className={styles.lbImg} />}
              {lbTotal > 1 && <button className={styles.lbNext} onClick={e=>{e.stopPropagation();nextMedia()}}>›</button>}
            </div>
            {lbTotal > 1 && (
              <div className={styles.lbThumbs}>
                {lbImgs.map((url,idx) => (
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
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div className={styles.lbCat}>{lightbox.product.category}</div>
                <button onClick={() => toggleWishlist(lightbox.product.id)}
                  style={{background:'none',border:'1px solid var(--border)',borderRadius:8,width:36,height:36,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:wishlist.includes(lightbox.product.id)?'var(--accent)':'var(--muted)',transition:'all .2s'}}>
                  <svg viewBox="0 0 24 24" fill={wishlist.includes(lightbox.product.id)?'currentColor':'none'} stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                    <path d="M12 21C12 21 4 15 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4S13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 15 12 21 12 21Z"/>
                  </svg>
                </button>
              </div>
              <div className={styles.lbName}>{lightbox.product.name}</div>
              <div className={styles.lbPrices}>
                <span className={styles.lbPrice}>{lightbox.product.price?.toLocaleString('ru')} ₽</span>
                {lightbox.product.old_price && (
                  <>
                    <span className={styles.lbOld}>{lightbox.product.old_price.toLocaleString('ru')} ₽</span>
                    <span style={{background:'#fef2f2',color:'#c45c5c',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:6}}>
                      -{discount(lightbox.product)}%
                    </span>
                  </>
                )}
              </div>
              {lightbox.product.description && <p className={styles.lbDesc}>{lightbox.product.description}</p>}
              {lightbox.product.sizes?.length > 0 && (
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontSize:12,color:'var(--text)',fontWeight:700,letterSpacing:.5}}>РАЗМЕР:</span>
                    <button onClick={() => setSizeChartOpen(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:12,textDecoration:'underline',padding:0,fontFamily:'var(--sans)'}}>
                      Таблица размеров →
                    </button>
                  </div>
                  <div className={styles.lbSizes}>
                    {lightbox.product.sizes.map(s => (
                      <span key={s} className={`${styles.lbSize} ${lightbox.selectedSize===s?styles.lbSizeActive:''}`}
                        onClick={() => setLightbox(l=>({...l,selectedSize:s}))}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{fontSize:12,color:'var(--text)',fontWeight:700,letterSpacing:.5,marginBottom:10}}>КОЛИЧЕСТВО:</div>
                <div style={{display:'flex',alignItems:'center',gap:0,border:'1.5px solid var(--border)',borderRadius:10,overflow:'hidden',width:'fit-content'}}>
                  <button onClick={() => setLbQty(q => Math.max(1, q-1))} style={{width:40,height:40,background:'none',border:'none',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text)'}}>−</button>
                  <span style={{width:44,textAlign:'center',fontSize:15,fontWeight:700,borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',height:40,display:'flex',alignItems:'center',justifyContent:'center'}}>{lbQty}</span>
                  <button onClick={() => setLbQty(q => q+1)} style={{width:40,height:40,background:'none',border:'none',cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text)'}}>+</button>
                </div>
              </div>
              <div style={{background:'var(--bg2)',borderRadius:10,padding:'12px 16px',fontSize:14}}>
                <div style={{display:'flex',justifyContent:'space-between',color:'var(--muted)'}}>
                  <span>{lbQty} шт × {lightbox.product.price?.toLocaleString('ru')} ₽</span>
                  <strong style={{color:'var(--text)'}}>{(lightbox.product.price * lbQty).toLocaleString('ru')} ₽</strong>
                </div>
              </div>
              <button className={styles.lbAddBtn} onClick={() => { addToCart(lightbox.product, lightbox.selectedSize, lbQty); closeLightbox() }}>
                + В корзину {lightbox.selectedSize && `(${lightbox.selectedSize})`}
              </button>
              <div className={styles.lbFacts}>
                <div className={styles.lbFact}><span>🚚</span><span>Доставка 2–7 дней по России</span></div>
                <div className={styles.lbFact}><span>🔒</span><span>Товар не подлежит обмену и возврату</span></div>
                <div className={styles.lbFact}><span>💳</span><span>Оплата картой МИР</span></div>
              </div>
              <a href={`https://wa.me/79114589339?text=${encodeURIComponent(`Здравствуйте! Хочу узнать подробнее о товаре: ${lightbox.product.name}`)}`}
                target="_blank" rel="noreferrer" className={styles.lbWa}>
                <WaIcon size={16}/>Задать вопрос о товаре
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ИЗБРАННОЕ */}
      {wishlistOpen && <div className={styles.cartOverlay} onClick={() => setWishlistOpen(false)} />}
      <div className={`${styles.cartSidebar} ${wishlistOpen ? styles.open : ''}`}>
        <div className={styles.cartHeader}>
          <h3>Избранное {wishlist.length > 0 && <span style={{fontSize:13,color:'var(--muted)',fontWeight:400}}>· {wishlist.length} шт</span>}</h3>
          <button onClick={() => setWishlistOpen(false)}>✕</button>
        </div>
        <div className={styles.cartItems}>
          {wishlist.length === 0 ? (
            <div className={styles.cartEmpty}>
              <div style={{fontSize:48,marginBottom:16}}>❤️</div>
              <p>Избранное пусто</p>
              <p style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Нажмите ❤️ на товаре чтобы добавить</p>
            </div>
          ) : (
            products.filter(p => wishlist.includes(p.id)).map(product => (
              <div key={product.id} style={{display:'flex',gap:12,marginBottom:16,paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
                {product.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} style={{width:72,height:96,objectFit:'cover',objectPosition:'top',borderRadius:8,cursor:'pointer',flexShrink:0}}
                    onClick={() => { openLightbox(product); setWishlistOpen(false) }} />
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'Georgia,serif',fontSize:14,marginBottom:4,color:'var(--text)',cursor:'pointer',lineHeight:1.3}}
                    onClick={() => { openLightbox(product); setWishlistOpen(false) }}>{product.name}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{product.category}</div>
                  <div style={{fontWeight:700,fontSize:15,color:'var(--accent-dark)',marginBottom:10}}>{product.price?.toLocaleString('ru')} ₽</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={() => { addToCart(product, product.sizes?.[0]); setWishlistOpen(false) }}
                      style={{flex:1,padding:'7px 12px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600}}>
                      + В корзину
                    </button>
                    <button onClick={() => toggleWishlist(product.id)}
                      style={{width:34,height:34,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#c45c5c',fontSize:16}}>
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function ProductCard({ product, onOpen, isWishlisted, onWishlist, discountPct }) {
  const [hovered, setHovered] = useState(false)
  const imgs = product.images || []
  const mainImg = imgs[0] || ''
  const hoverImg = imgs[1] || imgs[0] || ''

  return (
    <div className={styles.prodCard}>
      <div className={styles.prodImg}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onOpen(product)}
        style={{cursor:'pointer'}}>
        {mainImg && <img src={hovered && hoverImg ? hoverImg : mainImg} alt={product.name} loading="lazy" />}
        <div className={styles.prodBadges}>
          {product.is_new && <span className={styles.tagNew}>New</span>}
          {discountPct > 0 && <span className={styles.tagSale}>-{discountPct}%</span>}
          {product.video_url && <span className={styles.tagVideo}>▶ видео</span>}
        </div>
        <button className={styles.wishBtn} onClick={e=>{e.stopPropagation();onWishlist()}}
          style={{color: isWishlisted ? 'var(--accent)' : 'var(--muted)'}}>
          <svg viewBox="0 0 24 24" fill={isWishlisted?'currentColor':'none'} stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <path d="M12 21C12 21 4 15 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4S13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 15 12 21 12 21Z"/>
          </svg>
        </button>
        <div className={styles.addBar} onClick={e => { e.stopPropagation(); onOpen(product) }}>
          Выбрать размер →
        </div>
      </div>
      <div className={styles.prodBody}>
        <div className={styles.prodCat}>{product.category}</div>
        <div className={styles.prodName}>{product.name}</div>
        <div className={styles.prodPrices}>
          <span className={styles.now}>{product.price?.toLocaleString('ru')} ₽</span>
          {product.old_price && <span className={styles.was}>{product.old_price.toLocaleString('ru')} ₽</span>}
        </div>
        {product.sizes?.length > 0 && (
          <div className={styles.prodSizes}>{product.sizes.map(s=><span key={s}>{s}</span>)}</div>
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
    const allProducts = productsRes.data || []
    const settings = settingsRes.data || null
    const featuredIds = settings?.featured_ids || []
    const featuredProducts = featuredIds.length > 0
      ? allProducts.filter(p => featuredIds.includes(p.id))
      : allProducts.filter(p => p.is_new).slice(0, 10)
    return { props: { initialProducts: allProducts, settings, featuredProducts } }
  } catch {
    return { props: { initialProducts: [], settings: null, featuredProducts: [] } }
  }
}

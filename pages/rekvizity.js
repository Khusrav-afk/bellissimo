
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Rekvizity() {
  return (
    <>
      <Head>
        <title>Реквизиты — Bellissimo Lingerie</title>
        <meta name="description" content="Реквизиты интернет-магазина Bellissimo Lingerie" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* Шапка */}
      <header style={{ background:'rgba(253,249,246,.96)', borderBottom:'1px solid #ede4dc', padding:'14px 40px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/" style={{ fontFamily:'Georgia,serif', textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1.1 }}>
          <span style={{ fontStyle:'italic', color:'#c9748a', fontSize:28, letterSpacing:3 }}>Bellissimo</span>
          <span style={{ fontSize:9, letterSpacing:4, textTransform:'uppercase', color:'#9e8e85', fontWeight:300 }}>Lingerie</span>
        </a>
        <a href="/" style={{ fontSize:13, color:'#9e8e85', textDecoration:'none' }}>← Вернуться в магазин</a>
      </header>

      {/* Контент */}
      <main style={{ maxWidth:800, margin:'0 auto', padding:'48px 24px 80px', fontFamily:"'Nunito Sans', sans-serif" }}>

        <h1 style={{ fontFamily:'Georgia,serif', fontSize:36, fontWeight:300, marginBottom:8, color:'#3a2f2b' }}>
          Реквизиты
        </h1>
        <p style={{ color:'#9e8e85', fontSize:14, marginBottom:40, borderBottom:'1px solid #ede4dc', paddingBottom:24 }}>
          Интернет-магазин нижнего белья Bellissimo Lingerie
        </p>

        {/* Карточка реквизитов */}
        <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, overflow:'hidden', marginBottom:24 }}>
          <div style={{ background:'linear-gradient(135deg,#3a2f2b,#5a3a48)', padding:'20px 28px', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:32 }}>🌹</span>
            <div>
              <div style={{ fontFamily:'Georgia,serif', color:'#f0c8d2', fontSize:20, fontStyle:'italic' }}>Bellissimo Lingerie</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, letterSpacing:1 }}>ИНТЕРНЕТ-МАГАЗИН НИЖНЕГО БЕЛЬЯ</div>
            </div>
          </div>

          <div style={{ padding:'28px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
              <tbody>
                {[
                  ['Форма регистрации', 'Индивидуальный предприниматель'],
                  ['ИНН', '390503901110'],
                  ['ОГРНИП', '324390000042780'],
                  ['Адрес магазина', 'г. Калининград, магазин «Европа»'],
                  ['Телефон', '+7 911 458-93-39'],
                  ['WhatsApp', '+7 906 210-86-55'],
                  ['Сайт', 'bellissimolingerie.ru'],
                ].map(([label, value], i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f5f0ed' }}>
                    <td style={{ padding:'14px 0', color:'#9e8e85', fontSize:13, width:'40%', fontWeight:500, letterSpacing:.3 }}>{label}</td>
                    <td style={{ padding:'14px 0', color:'#3a2f2b', fontWeight:600 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Доставка и оплата */}
        <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28, marginBottom:24 }}>
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:300, marginBottom:20, color:'#3a2f2b' }}>Оплата и доставка</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:14, color:'#3a2f2b' }}>
            <div style={{ display:'flex', gap:12 }}>
              <span>💳</span>
              <span>Оплата банковскими картами онлайн через сервис ЮKassa (ООО НКО «ЮМани»)</span>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <span>✉️</span>
              <span>Доставка Почтой России — 590 ₽, срок 5–14 дней</span>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <span>⚡</span>
              <span>Срочная доставка — 1 100 ₽, срок 2–5 дней</span>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <span>🏪</span>
              <span>Самовывоз в Калининграде — бесплатно</span>
            </div>
          </div>
        </div>

        {/* Возврат */}
        <div style={{ background:'#fff8f0', border:'1.5px solid #ffe4b5', borderRadius:16, padding:28, marginBottom:24 }}>
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:300, marginBottom:12, color:'#3a2f2b' }}>Возврат товара</h2>
          <p style={{ fontSize:14, color:'#5a4a3a', lineHeight:1.7 }}>
            В соответствии с постановлением Правительства РФ № 55 от 19.01.1998, 
            нижнее бельё и купальники надлежащего качества не подлежат обмену и возврату 
            по санитарным нормам.
          </p>
        </div>

        {/* Контакты */}
        <div style={{ background:'#fff', border:'1.5px solid #ede4dc', borderRadius:16, padding:28 }}>
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:300, marginBottom:20, color:'#3a2f2b' }}>Контакты</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <a href="tel:+79114589339" style={{ display:'flex', gap:12, alignItems:'center', textDecoration:'none', color:'#3a2f2b', fontSize:14 }}>
              <span>📞</span><span>+7 911 458-93-39</span>
            </a>
            <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer" style={{ display:'flex', gap:12, alignItems:'center', textDecoration:'none', color:'#3a2f2b', fontSize:14 }}>
              <span>💬</span><span>WhatsApp: +7 906 210-86-55</span>
            </a>
            <a href="https://t.me/bellissimolingerie" target="_blank" rel="noreferrer" style={{ display:'flex', gap:12, alignItems:'center', textDecoration:'none', color:'#3a2f2b', fontSize:14 }}>
              <span>✈️</span><span>Telegram: @bellissimolingerie</span>
            </a>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:40 }}>
          <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px', background:'#c9748a', color:'#fff', borderRadius:10, textDecoration:'none', fontSize:14, fontWeight:600 }}>
            ← Вернуться в магазин
          </a>
        </div>
      </main>

      {/* Футер */}
      <footer style={{ background:'#3a2f2b', color:'rgba(255,255,255,.4)', padding:'20px 40px', textAlign:'center', fontSize:12 }}>
        © 2026 Bellissimo Lingerie · ИНН 390503901110 · ОГРНИП 324390000042780
      </footer>
    </>
  )
}

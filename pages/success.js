import { useRouter } from 'next/router'
import Head from 'next/head'
import { useEffect, useState } from 'react'

export default function Success() {
  const { query } = useRouter()
  const [status, setStatus] = useState('loading') // loading | paid | pending | canceled

  useEffect(() => {
    if (!query.order) return
    // Проверяем статус заказа через наш API
    fetch(`/api/check-payment?order=${query.order}`)
      .then(r => r.json())
      .then(data => setStatus(data.status || 'pending'))
      .catch(() => setStatus('pending'))
  }, [query.order])

  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f4f1' }}>
      <div style={{ fontSize:32 }}>⏳</div>
    </div>
  )

  // НЕ ОПЛАЧЕН
  if (status !== 'paid') return (
    <>
      <Head><title>Оплата не завершена — Bellissimo</title></Head>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f4f1', fontFamily:"'Nunito Sans',sans-serif", padding:20 }}>
        <div style={{ background:'#fff', padding:48, borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)', maxWidth:480, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>❌</div>
          <h1 style={{ fontFamily:'Georgia,serif', fontWeight:300, color:'#3a2f2b', marginBottom:12, fontSize:26 }}>
            Оплата не завершена
          </h1>
          <p style={{ color:'#9e8e85', marginBottom:8, fontSize:15 }}>
            Вы не завершили оплату или она была отменена.
          </p>
          <p style={{ color:'#9e8e85', marginBottom:28, fontSize:14 }}>
            Ваш заказ сохранён — вы можете оплатить его позже или оформить новый.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <a href="https://wa.me/79114589339?text=Здравствуйте! Хочу оплатить заказ."
              target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 28px', background:'#25d366', color:'#fff', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:15 }}>
              💬 Написать в WhatsApp
            </a>
            <a href="/"
              style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:15 }}>
              ← Вернуться в магазин
            </a>
          </div>
        </div>
      </div>
    </>
  )

  // ОПЛАЧЕН ✅
  return (
    <>
      <Head><title>Заказ оплачен — Bellissimo</title></Head>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f4f1', fontFamily:"'Nunito Sans',sans-serif", padding:20 }}>
        <div style={{ background:'#fff', padding:48, borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)', maxWidth:480, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
          <h1 style={{ fontFamily:'Georgia,serif', fontWeight:300, color:'#3a2f2b', marginBottom:12, fontSize:26 }}>
            Оплата прошла!
          </h1>
          <p style={{ color:'#9e8e85', marginBottom:8, fontSize:15 }}>
            Ваш заказ принят и оплачен.
          </p>
          <p style={{ color:'#9e8e85', marginBottom:4, fontSize:14 }}>
            Менеджер свяжется с вами в ближайшее время.
          </p>
          {query.order && (
            <div style={{ background:'#fdf3f5', border:'1px solid #f0c8d2', borderRadius:10, padding:'10px 20px', margin:'16px 0 24px', fontSize:13, color:'#c9748a' }}>
              № заказа: <strong>{query.order.slice(0,8).toUpperCase()}</strong>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <a href="https://wa.me/79114589339?text=Здравствуйте! Я оплатила заказ, жду подтверждения."
              target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 28px', background:'#25d366', color:'#fff', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:15 }}>
              💬 Написать в WhatsApp
            </a>
            <a href="/"
              style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#c9748a,#a55570)', color:'#fff', borderRadius:10, textDecoration:'none', fontWeight:600, fontSize:15 }}>
              ← Вернуться в магазин
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

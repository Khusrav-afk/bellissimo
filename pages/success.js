import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SuccessPage() {
  const router = useRouter()

  return (
    <>
      <Head><title>Заказ оплачен — Bellissimo</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f8f4f1',
        fontFamily: "'Nunito Sans', sans-serif", padding: 24
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '48px 40px',
          textAlign: 'center', maxWidth: 460, width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,.08)', border: '1.5px solid #ede4dc'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{
            fontFamily: 'Georgia, serif', fontWeight: 300,
            fontSize: 28, color: '#3a2f2b', marginBottom: 8
          }}>Оплата прошла!</h1>
          <p style={{ color: '#9e8e85', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
            Ваш заказ принят и оплачен.<br />
            Менеджер свяжется с вами в ближайшее время.
          </p>
          <a href="https://wa.me/79114589339" target="_blank" rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', background: '#25d366', color: '#fff',
              borderRadius: 10, textDecoration: 'none', fontWeight: 600,
              fontSize: 14, marginBottom: 16
            }}>
            💬 Написать в WhatsApp
          </a>
          <br />
          <button onClick={() => router.push('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#c9748a', fontSize: 14, textDecoration: 'underline', marginTop: 8
            }}>
            ← Вернуться в магазин
          </button>
        </div>
      </div>
    </>
  )
}

import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Success() {
  const { query } = useRouter()

  return (
    <>
      <Head><title>Заказ оформлен — Bellissimo</title></Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f4f1',
        fontFamily: "'Nunito Sans', sans-serif",
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#fff',
          padding: 48,
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,.1)',
          maxWidth: 480,
          width: '100%'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 300,
            color: '#3a2f2b',
            marginBottom: 12,
            fontSize: 28
          }}>
            Спасибо за заказ!
          </h1>
          <p style={{ color: '#9e8e85', marginBottom: 8, fontSize: 15 }}>
            Ваш заказ принят и оплата прошла успешно.
          </p>
          <p style={{ color: '#9e8e85', marginBottom: 24, fontSize: 14 }}>
            Мы свяжемся с вами в ближайшее время.
          </p>
          {query.order && (
            <div style={{
              background: '#fdf3f5',
              border: '1px solid #f0c8d2',
              borderRadius: 10,
              padding: '10px 20px',
              marginBottom: 24,
              fontSize: 13,
              color: '#c9748a'
            }}>
              № заказа: <strong>{query.order.slice(0, 8).toUpperCase()}</strong>
            </div>
          )}
          <a href="/" style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'linear-gradient(135deg,#c9748a,#a55570)',
            color: '#fff',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15
          }}>
            Вернуться на сайт
          </a>
        </div>
      </div>
    </>
  )
}

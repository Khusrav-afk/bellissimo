import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const event = req.body

  // Платёж успешно оплачен
  if (event.event === 'payment.succeeded') {
    const orderId = event.object.metadata?.order_id
    if (orderId) {
      await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId)
    }
  }

  // Платёж отменён
  if (event.event === 'payment.canceled') {
    const orderId = event.object.metadata?.order_id
    if (orderId) {
      await supabase.from('orders').update({ status: 'canceled' }).eq('id', orderId)
    }
  }

  res.status(200).json({ ok: true })
}

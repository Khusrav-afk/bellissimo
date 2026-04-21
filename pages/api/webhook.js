import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const event = req.body

  // Базовая проверка что это реальный запрос от ЮКассы
  if (!event?.event || !event?.object) {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const orderId = event.object?.metadata?.order_id

  if (!orderId) {
    return res.status(200).json({ ok: true }) // нет order_id — игнорируем
  }

  if (event.event === 'payment.succeeded') {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
    if (error) console.error('Webhook paid error:', error)
  }

  if (event.event === 'payment.canceled') {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'canceled' })
      .eq('id', orderId)
    if (error) console.error('Webhook canceled error:', error)
  }

  res.status(200).json({ ok: true })
}

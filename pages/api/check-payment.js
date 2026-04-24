import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  const { order } = req.query
  if (!order) return res.status(400).json({ status: 'error' })

  // Проверяем статус в нашей базе
  const { data, error } = await supabase
    .from('orders')
    .select('status, payment_id')
    .eq('id', order)
    .single()

  if (error || !data) return res.status(404).json({ status: 'pending' })

  // Если уже финальный статус — возвращаем сразу
  if (['paid', 'shipped', 'completed'].includes(data.status)) {
    return res.status(200).json({ status: 'paid' })
  }

  if (data.status === 'canceled') {
    return res.status(200).json({ status: 'canceled' })
  }

  // Проверяем актуальный статус в ЮКассе
  if (data.payment_id) {
    try {
      const credentials = Buffer.from(
        `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
      ).toString('base64')

      const ykRes = await fetch(`https://api.yookassa.ru/v3/payments/${data.payment_id}`, {
        headers: { 'Authorization': `Basic ${credentials}` }
      })
      const payment = await ykRes.json()
      console.log('YooKassa payment status:', payment.status)

      if (payment.status === 'succeeded') {
        await supabase.from('orders').update({ status: 'paid' }).eq('id', order)
        return res.status(200).json({ status: 'paid' })
      }

      // Если pending/canceled/waiting_for_capture — клиент вышел не оплатив
      if (['canceled', 'pending', 'waiting_for_capture'].includes(payment.status)) {
        await supabase.from('orders').update({ status: 'canceled' }).eq('id', order)
        return res.status(200).json({ status: 'canceled' })
      }

    } catch (e) {
      console.error('YooKassa check error:', e)
    }
  }

  // Если нет payment_id или не смогли проверить — тоже отмена
  await supabase.from('orders').update({ status: 'canceled' }).eq('id', order)
  return res.status(200).json({ status: 'canceled' })
}

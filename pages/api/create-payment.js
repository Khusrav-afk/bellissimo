import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    items,
    totalAmount,
    promoCode,
    discountAmount
  } = req.body

  // 1. Сохраняем заказ в Supabase
  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_address: customerAddress,
      items,
      total_amount: totalAmount,
      promo_code: promoCode || null,
      discount_amount: discountAmount || 0,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // 2. Создаём платёж в ЮКассе
  const idempotenceKey = order.id

  const paymentBody = {
    amount: {
      value: totalAmount.toFixed(2),
      currency: 'RUB'
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?order=${order.id}`
    },
    capture: true,
    description: `Заказ #${order.id.slice(0, 8)}`,
    metadata: { order_id: order.id }
  }

  const credentials = Buffer.from(
    `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  ).toString('base64')

  const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey
    },
    body: JSON.stringify(paymentBody)
  })

  const payment = await ykRes.json()

  if (!payment.id) {
    return res.status(500).json({ error: 'ЮКасса не ответила', details: payment })
  }

  // 3. Сохраняем payment_id и ссылку в заказ
  await supabase.from('orders').update({
    payment_id: payment.id,
    payment_url: payment.confirmation.confirmation_url
  }).eq('id', order.id)

  // 4. Возвращаем ссылку на оплату
  res.status(200).json({
    paymentUrl: payment.confirmation.confirmation_url,
    orderId: order.id
  })
}

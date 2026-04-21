import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { customerName, customerPhone, customerEmail, customerAddress, items, totalAmount, promoCode, discountAmount } = req.body

  // 1. Сохраняем заказ
  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || '',
      customer_address: customerAddress,
      items,
      total_amount: totalAmount,
      promo_code: promoCode || null,
      discount_amount: discountAmount || 0,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Ошибка сохранения: ' + error.message })
  }

  // 2. Формируем позиции чека
  const receiptItems = items.map(item => ({
    description: item.name + (item.size ? ` (${item.size})` : ''),
    quantity: item.qty,
    amount: {
      value: Number(item.price).toFixed(2),
      currency: 'RUB'
    },
    vat_code: 1 // без НДС
  }))

  // Добавляем доставку если есть
  const deliveryCost = totalAmount - items.reduce((s, x) => s + x.price * x.qty, 0)
  if (deliveryCost > 0) {
    receiptItems.push({
      description: 'Доставка',
      quantity: 1,
      amount: {
        value: Number(deliveryCost).toFixed(2),
        currency: 'RUB'
      },
      vat_code: 1
    })
  }

  // 3. Запрос к ЮКассе
  const credentials = Buffer.from(
    `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  ).toString('base64')

  const paymentBody = {
    amount: {
      value: Number(totalAmount).toFixed(2),
      currency: 'RUB'
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?order=${order.id}`
    },
    capture: true,
    description: `Заказ #${order.id.slice(0, 8)}`,
    metadata: { order_id: order.id },
    receipt: {
      customer: {
        phone: customerPhone.replace(/\D/g, '').replace(/^8/, '7')
      },
      items: receiptItems
    }
  }

  let payment
  try {
    const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': order.id
      },
      body: JSON.stringify(paymentBody)
    })
    payment = await ykRes.json()
    console.log('YooKassa status:', ykRes.status)
    console.log('YooKassa response:', JSON.stringify(payment))
  } catch (e) {
    console.error('Fetch error:', e)
    return res.status(500).json({ error: 'Не удалось подключиться к ЮКассе' })
  }

  if (!payment.id || !payment.confirmation) {
    return res.status(500).json({
      error: payment.description || payment.message || 'Ошибка ЮКассы',
      yookassa_error: payment
    })
  }

  // 4. Сохраняем payment_id
  await supabase.from('orders').update({
    payment_id: payment.id,
    payment_url: payment.confirmation.confirmation_url
  }).eq('id', order.id)

  res.status(200).json({
    paymentUrl: payment.confirmation.confirmation_url,
    orderId: order.id
  })
}

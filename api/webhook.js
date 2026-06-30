import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const OWNER_EMAIL = process.env.OWNER_EMAIL; // อีเมลของออยเอง ไว้รับแจ้งเตือนทุกออเดอร์

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ============================================
// ตั้งค่าสินค้าทั้งหมดตรงนี้ที่เดียว
// เพิ่มสินค้าใหม่ในอนาคต = เพิ่ม block ใหม่ตรงนี้ ไม่ต้องแตะส่วนอื่น
// ============================================
const PRODUCTS = {
  [process.env.PRICE_ID_EBOOK]: {
    label: 'Ebook (เรียนจีนผ่านเรื่องสั้น Vol.2)',
    subject: 'ขอบคุณที่ซื้อ เรียนจีนผ่านเรื่องสั้น Vol.2',
    needsFollowUp: false,
    html: () => `<div style="font-family:sans-serif;padding:32px">
      <h2>ขอบคุณที่ซื้อนะ! 🎉</h2>
      <p>กดปุ่มด้านล่างเพื่อดาวน์โหลด Ebook ได้เลยครับ</p>
      <a href="${process.env.PDF_LINK}" style="display:inline-block;padding:14px 32px;background:#c8602a;color:white;border-radius:12px;text-decoration:none">ดาวน์โหลด Ebook</a>
    </div>`,
  },

  [process.env.PRICE_ID_COURSE_ONLINE]: {
    label: 'Online Course (5,990)',
    subject: 'ยืนยันการสมัคร Online Course 🎉',
    needsFollowUp: true,
    html: (name) => `<div style="font-family:sans-serif;padding:32px">
      <h2>ขอบคุณที่สมัครนะ! 🎉</h2>
      <p>สวัสดีค่ะ ${name || 'คุณลูกค้า'}</p>
      <p>เราได้รับการสมัครเรียบร้อยแล้ว ทางทีมจะติดต่อกลับไปเพื่อเพิ่มสิทธิ์เข้าเรียนและ community group ให้ภายใน 24 ชั่วโมงนะคะ</p>
      <p>มีคำถามทักมาได้เลยที่ <a href="${process.env.CONTACT_LINK}">${process.env.CONTACT_LINK}</a></p>
    </div>`,
  },

  [process.env.PRICE_ID_COURSE_1ON1]: {
    label: '1-on-1 Program (19,990)',
    subject: 'ยืนยันการสมัคร 1-on-1 Program 🎉',
    needsFollowUp: true,
    html: (name) => `<div style="font-family:sans-serif;padding:32px">
      <h2>ขอบคุณที่สมัครนะ! 🎉</h2>
      <p>สวัสดีค่ะ ${name || 'คุณลูกค้า'}</p>
      <p>เนื่องจากเป็นโปรแกรมแบบดูแลตัวต่อตัว ทางทีมจะ<b>ติดต่อกลับไปนัดคุยรายละเอียด</b>และเริ่มต้นโปรแกรมภายใน 24 ชั่วโมงนะคะ</p>
      <p>รบกวนรอข้อความจากทางเราได้เลยค่ะ ไม่ต้องทักมาก่อนก็ได้</p>
    </div>`,
  },
};

function getProduct(priceId) {
  // ถ้า price id ไม่ตรงกับอะไรเลย ให้ fallback เป็น ebook (เหมือนพฤติกรรมเดิม)
  return PRODUCTS[priceId] || PRODUCTS[process.env.PRICE_ID_EBOOK];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details && session.customer_details.email;
    const customerName = session.customer_details && session.customer_details.name;
    const amount = session.amount_total ? (session.amount_total / 100).toLocaleString() : '?';

    // ดึง price id จริงจาก line items เพื่อรู้ว่าลูกค้าซื้อสินค้าตัวไหน
    let priceId = null;
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      priceId = lineItems.data[0]?.price?.id || null;
    } catch (err) {
      console.error('listLineItems error:', err);
    }

    const product = getProduct(priceId);

    // ส่งอีเมลหาลูกค้า
    if (customerEmail) {
      await transporter.sendMail({
        from: 'oilalongtheway <' + process.env.GMAIL_USER + '>',
        to: customerEmail,
        subject: product.subject,
        html: product.html(customerName),
      });
    }

    // แจ้งออยทุกครั้งที่ขายได้
    if (OWNER_EMAIL) {
      await transporter.sendMail({
        from: 'oilalongtheway <' + process.env.GMAIL_USER + '>',
        to: OWNER_EMAIL,
        subject: `🔔 ขายได้: ${product.label}${product.needsFollowUp ? ' (ต้องติดต่อกลับ!)' : ''}`,
        html: `<div style="font-family:sans-serif;padding:24px">
          <p><b>สินค้า:</b> ${product.label}</p>
          <p><b>ลูกค้า:</b> ${customerName || '-'} (${customerEmail || '-'})</p>
          <p><b>ยอด:</b> ${amount} บาท</p>
          ${product.needsFollowUp ? '<p style="color:#c8602a"><b>⚠️ ต้องติดต่อกลับลูกค้าภายใน 24 ชม.</b></p>' : ''}
        </div>`,
      });
    }
  }

  res.status(200).json({ received: true });
}

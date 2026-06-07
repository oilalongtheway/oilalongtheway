import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const PDF_LINK = process.env.PDF_LINK;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;

    if (customerEmail) {
      await resend.emails.send({
        from: 'oilalongtheway <onboarding@resend.dev>',
        to: customerEmail,
        subject: '📚 เรียนจีนผ่านเรื่องสั้น Vol.2 — ขอบคุณที่ซื้อนะ!',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #2c1f0e;">ขอบคุณที่ซื้อนะ! 🎉</h2>
            <p style="color: #9e8672; line-height: 1.8;">
              ได้รับการชำระเงินเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อดาวน์โหลด Ebook ได้เลยครับ
            </p>
            <a href="${PDF_LINK}"
               style="display:inline-block; margin-top:24px; padding:14px 32px;
               import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const PDF_LINK = process.env.PDF_LINK;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;

    if (customerEmail) {
      await resend.emails.send({
        from: 'oilalongtheway <onboarding@resend.dev>',
        to: customerEmail,
        subject: '📚 เรียนจีนผ่านเรื่องสั้น Vol.2 — ขอบคุณที่ซื้อนะ!',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #2c1f0e;">ขอบคุณที่ซื้อนะ! 🎉</h2>
            <p style="color: #9e8672; line-height: 1.8;">
              ได้รับการชำระเงินเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อดาวน์โหลด Ebook ได้เลยครับ
            </p>
            <a href="${PDF_LINK}"
               style="display:inline-block; margin-top:24px; padding:14px 32px;
                 }

import {CatalogError} from './catalog.js';

/**
 * Persist a previously verified Mercado Pago payment.
 * NEVER call using a webhook body or browser redirect.
 * Caller must first verify signature, fetch payment from Mercado Pago and
 * check status/currency/reference/amount using validateConfirmedPayment().
 *
 * This function intentionally DOES NOT trigger orders at VAVI.
 */
export async function recordVerifiedPayment(db, verification, providerEventId) {
  if (!db || typeof db.batch !== 'function' || typeof db.prepare !== 'function') {
    throw new CatalogError('database_not_configured','Banco indisponível.',503);
  }
  const {orderId,paymentId,status}=verification||{};
  if (status!=='paid' || !/^ord_[a-f0-9]{32}$/.test(orderId||'') ||
      !/^\d{1,30}$/.test(paymentId||'') ||
      typeof providerEventId!=='string' || !/^[a-zA-Z0-9_.:-]{1,150}$/.test(providerEventId)) {
    throw new CatalogError('invalid_payment_confirmation','Confirmação inválida.',409);
  }

  let results;
  try {
    results=await db.batch([
      db.prepare(`UPDATE store_orders SET status='paid', mp_payment_id=?,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND status='awaiting_payment' AND mp_payment_id IS NULL`)
        .bind(paymentId,orderId),
      db.prepare(`INSERT OR IGNORE INTO store_payment_events
        (provider_event_id,order_id,provider_payment_id,event_kind)
        SELECT ?,id,?,'payment.approved'
        FROM store_orders WHERE id=? AND status='paid' AND mp_payment_id=?`)
        .bind(providerEventId,paymentId,orderId,paymentId),
      db.prepare(`SELECT id,status,mp_payment_id FROM store_orders WHERE id=?`)
        .bind(orderId)
    ]);
  } catch {
    throw new CatalogError('payment_write_failed','Não foi possível registrar pagamento.',503);
  }
  const row=results?.[2]?.results?.[0];
  if (!row || row.status!=='paid' || String(row.mp_payment_id)!==paymentId) {
    throw new CatalogError('payment_order_conflict',
      'Pagamento não corresponde a um pedido aguardando pagamento.',409);
  }
  return {orderId,status:'paid',alreadyPaid:(results?.[0]?.meta?.changes||0)===0,
    // Receiving a payment must not silently initiate production.
    vaviOrderCreated:false};
}

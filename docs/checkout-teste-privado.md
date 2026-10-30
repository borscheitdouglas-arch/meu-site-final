# Checkout privado de homologação

A rota `POST /api/checkout/test` exige Authorization: Bearer com a chave privada CHECKOUT_TEST_API_KEY, aleatória com no mínimo 32 caracteres e salva apenas como Cloudflare Secret.

Para habilitar, TODOS os requisitos devem ser cumpridos: CHECKOUT_TEST_ENABLED=true, WEBHOOK_PROCESSING_ENABLED=true, DELIVERY_PERSISTENCE_ENABLED=true, MERCADOPAGO_WEBHOOK_SECRET configurado e testado, DELIVERY_ENCRYPTION_KEY_B64 presente, credencial Mercado Pago de teste, VAVI_SHIPPING_PRODUCTS_JSON confirmado com a VAVI, variante disponível e validada no banco, dados do comprador e opção de frete conferidos.

A rota somente serve à homologação privada; não deve ser exposta no HTML nem receber chaves de um navegador público. Checkout público e envios automáticos VAVI continuam desativados.

Corpo de teste: items:[{sku,quantity}], zipCode, shippingOptionId, buyer:{name,email,phone,taxId,zipCode,street,number,complement,neighborhood,city,state}.

Sequência: catálogo no servidor, frete real VAVI, pedido D1, criptografia e salvamento do endereço, criação da preferência de teste Mercado Pago, registro awaiting_payment. Não ativar antes de validar cotação, webhook e retenção de dados.

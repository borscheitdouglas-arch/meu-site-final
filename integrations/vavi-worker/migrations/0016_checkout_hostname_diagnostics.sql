-- Somente hostname seguro, jamais URL completa de checkout ou parâmetros.
ALTER TABLE store_checkout_failures ADD COLUMN provider_url_hostname TEXT;

"""Teste isolado do botão de checkout: sem pagamentos, VAVI ou dados pessoais."""
from __future__ import annotations

import json
import re
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:8765"
CART_KEY = "douglasShopCart_v2"


def main() -> None:
    with sync_playwright() as play:
        browser = play.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        def readiness(route):
            route.fulfill(status=200, content_type="application/json",
                headers={"access-control-allow-origin": "*"},
                body=json.dumps({
                    "checkoutEnabled": True,
                    "multiCheckoutEnabled": True,
                    "availableSkus": ["salve-regina-preta-g"]
                }))

        page.route("**/api/checkout/live/readiness", readiness)
        page.goto(BASE + "/pages/cart.html", wait_until="domcontentloaded")

        def cart_with(items):
            page.evaluate("(items) => localStorage.setItem('douglasShopCart_v2', JSON.stringify(items))", items)
            page.reload(wait_until="domcontentloaded")

        cart_with([{"id": "camiseta-salve-regina", "variant": "G", "qty": 2}])
        checkout_button = page.get_by_role("button", name=re.compile("Finalizar compra"))
        expect(checkout_button).to_be_enabled(timeout=12000)
        checkout_button.click()
        expect(page).to_have_url(re.compile(r"/pages/checkout-carrinho.html"), timeout=12000)
        print("PASS: 2 camisetas G avançam ao checkout sem cotação prévia")

        page.goto(BASE + "/pages/cart.html", wait_until="domcontentloaded")
        cart_with([{"id": "caneca-salve-regina-preta", "variant": "unico", "qty": 1}])
        assisted = page.get_by_role("link", name=re.compile("Consultar este pedido pelo WhatsApp"))
        expect(assisted).to_be_visible(timeout=12000)
        assert assisted.get_attribute("href").startswith("https://wa.me/5511978038063?text=")
        assert page.get_by_role("button", name="Finalizar compra").count() == 0
        print("PASS: peça pendente apresenta ação de atendimento, sem botão de pagamento morto")
        browser.close()


if __name__ == "__main__":
    main()

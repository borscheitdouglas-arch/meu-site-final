"""Teste das opções da página de produto, sem acessar pagamentos reais."""
import json
import re
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:8765"


def main():
    with sync_playwright() as play:
        browser = play.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        requests = []

        def readiness(route):
            route.fulfill(status=200, content_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"},
                body=json.dumps({
                    "checkoutEnabled": True,
                    "multiCheckoutEnabled": True,
                    "availableSkus": ["salve-regina-preta-g"]
                }))

        def shipping_quote(route):
            body = route.request.post_data_json
            requests.append(body)
            options = [{
                "id": "delivery-test-1", "name": "Entrega Econômica",
                "shippingCost": 12.50, "deliveryTime": 5, "isActive": True
            }]
            response = {
                "zipCode": body["zipCode"], "currency": "BRL",
                "options": options, "checkoutEnabled": False,
                "provisional": True,
                "items": body.get("items") or []
            }
            if "sku" in body:
                response["sku"] = body["sku"]
            route.fulfill(status=200, content_type="application/json",
                headers={"Access-Control-Allow-Origin": "*"},
                body=json.dumps(response))

        page.route("**/api/checkout/live/readiness", readiness)
        page.route("**/api/shipping/cart-preview", shipping_quote)
        page.route("**/api/shipping/preview", shipping_quote)

        page.goto(BASE + "/pages/produto-loja.html?id=camiseta-salve-regina",
            wait_until="domcontentloaded")
        expect(page.get_by_role("button", name="XG", exact=True)).to_be_visible(timeout=12000)
        for size in ["P", "M", "G", "GG", "XG"]:
            expect(page.get_by_role("button", name=size, exact=True)).to_be_visible()
        page.get_by_role("button", name="XG", exact=True).click()
        expect(page.locator(".shop-single-price")).to_contain_text("119,90")
        page.get_by_role("button", name="G", exact=True).click()
        expect(page.locator(".shop-single-price")).to_contain_text("109,90")
        quantity = page.locator(".shop-single-quantity-input")
        expect(quantity).to_have_value("1")
        page.get_by_role("button", name="Aumentar quantidade").click()
        expect(quantity).to_have_value("2")

        page.locator(".shop-single-shipping input[name=zipCode]").fill("01001-000")
        page.locator(".shop-single-shipping button[type=submit]").click()
        expect(page.locator(".shop-single-quote-line")).to_have_count(1, timeout=12000)
        assert requests[-1]["items"] == [{"sku": "salve-regina-preta-g", "quantity": 2}]
        assert "232,30" in page.locator(".shop-single-quote-line").inner_text()
        page.get_by_role("button", name="Adicionar ao carrinho").click()
        cart = page.evaluate("JSON.parse(localStorage.getItem('douglasShopCart_v2'))")
        assert any(x["id"] == "camiseta-salve-regina" and x["qty"] == 2 for x in cart)
        print("PASS: tamanhos, preço XG, quantidade, frete conjunto e carrinho")

        page.goto(BASE + "/pages/produto-loja.html?id=caneca-salve-regina-preta",
            wait_until="domcontentloaded")
        expect(page.get_by_role("link", name="P&B")).to_be_visible(timeout=12000)
        page.get_by_role("link", name="P&B").click()
        expect(page).to_have_url(re.compile("id=caneca-salve-regina-pb"))
        print("PASS: alternativas de caneca navegáveis e sem habilitar cobrança")

        browser.close()


if __name__ == "__main__":
    main()

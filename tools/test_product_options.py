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
        image = page.locator(".shop-single-image-clip > img")
        first_photo = image.get_attribute("src")
        page.get_by_role("button", name="Próxima imagem", exact=True).click()
        assert image.get_attribute("src") != first_photo
        page.get_by_role("button", name="Ampliar imagem", exact=True).click()
        viewer = page.get_by_role("dialog")
        expect(viewer).to_be_visible()
        expect(viewer.locator(".shop-gallery-counter")).to_have_text("2 / 6")
        page.get_by_role("button", name="Próxima imagem ampliada", exact=True).click()
        expect(viewer.locator(".shop-gallery-counter")).to_have_text("3 / 6")
        page.keyboard.press("Escape")
        expect(viewer).not_to_be_visible()
        expect(page.get_by_role("button", name="Ampliar imagem", exact=True)).to_be_focused()
        page.get_by_role("button", name="Imagem anterior", exact=True).click()
        page.get_by_role("button", name="Imagem anterior", exact=True).click()
        expect(image).to_have_attribute("src", first_photo)
        print("PASS: navegação, ampliação, contador, fechamento e retorno de foco da galeria")
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
        expect(page.get_by_role("link", name="Nossa Senhora", exact=True)).to_be_visible(timeout=12000)
        page.get_by_role("link", name="Nossa Senhora", exact=True).click()
        expect(page).to_have_url(re.compile("id=caneca-salve-regina-pb"))
        print("PASS: alternativas de caneca navegáveis e sem habilitar cobrança")

        # Regressão: mesmo sem readiness contendo os SKUs da Cor Iesu,
        # o botão deve permanecer Comprar agora e ir ao checkout,
        # onde a API fará sua própria validação antes de qualquer cobrança.
        page.goto(BASE + "/pages/produto-loja.html?id=camiseta-cor-iesu-sacratissimum",
            wait_until="domcontentloaded")
        top = page.locator(".shop-single-top-buy")
        expect(top).to_be_visible(timeout=12000)
        expect(top).to_contain_text("Comprar agora")
        assert top.is_enabled()
        assert page.evaluate("""() => {
          const price=document.querySelector('.shop-single-pricebox');
          const top=document.querySelector('.shop-single-top-buy');
          const options=document.querySelector('.shop-single-color-group');
          const freight=document.querySelector('.shop-single-shipping');
          return price.contains(top) && top.compareDocumentPosition(options)&4 &&
                 options.compareDocumentPosition(freight)&4;
        }"""), "Compra deve aparecer junto ao preço; frete fica após as opções"
        assert page.locator(".shop-single-variant-chip").count()==4, "Somente P/M/G/GG, sem tamanhos duplicados"
        page.locator('[aria-label="Selecionar cor Bordô"]').click()
        page.locator(".shop-single-native-select").select_option("GG")
        expect(top).to_contain_text("Comprar agora")
        expect(page.locator(".shop-single-top-selection")).to_contain_text("Bordô")
        expect(page.locator(".shop-single-top-selection")).to_contain_text("GG")
        expect(page.locator(".shop-single-price")).to_contain_text("109,90")
        page.get_by_role("button", name="Adicionar ao carrinho").click()
        cart=page.evaluate("JSON.parse(localStorage.getItem('douglasShopCart_v2'))")
        assert any(item["id"]=="camiseta-cor-iesu-sacratissimum" and
                   item["variant"]=="cor-iesu-bordo-gg" for item in cart), cart
        # No checkout, simular resposta de disponibilidade aprovada (sem pagamento).
        def checkout_ready(route):
            colors=("marrom","branco","preto","off-white","azul-marinho",
                    "azul-royal","verde","cinza-claro","cinza-escuro","areia","bordo")
            skus=["cor-iesu-"+color+"-"+size for color in colors
                  for size in ("p","m","g","gg")]
            route.fulfill(status=200,content_type="application/json",
                          headers={"Access-Control-Allow-Origin":"*"},
                          body=json.dumps({"checkoutEnabled":True,
                                           "paymentProvider":"infinitepay",
                                           "availableSkus":skus}))
        page.route("**/api/checkout/live/readiness",checkout_ready)
        top.click()
        expect(page).to_have_url(re.compile(r"checkout-salve-regina[.]html[?]sku=cor-iesu-bordo-gg"))
        expect(page.locator("#checkout-container")).to_be_visible(timeout=15000)
        expect(page.locator("#checkout-product-name")).to_contain_text("Cor Iesu")
        print("PASS: botão Comprar visível, sem consulta por e-mail; carrinho preserva Bordô GG; checkout abre a cor certa")

        browser.close()


if __name__ == "__main__":
    main()

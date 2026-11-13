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
                    "availableSkus": ["salve-regina-preta-g",
                      "salve-regina-preta-xg",
                      "caneca-salve-regina-preta","caneca-salve-regina-pb",
                      "ecobag-salve-regina-m","ecobag-salve-regina-g"]
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

        expect(page.locator(".shop-single-freight-disclosure")).to_be_visible()
        expect(page.locator(".shop-single-quantity-subtotal")).to_contain_text("219,80")
        page.locator(".shop-single-freight-disclosure > summary").click()
        page.locator(".shop-single-shipping input[name=zipCode]").fill("01001-000")
        page.locator(".shop-single-shipping button[type=submit]").click()
        expect(page.locator(".shop-single-quote-line")).to_have_count(1, timeout=12000)
        assert requests[-1]["items"] == [{"sku": "salve-regina-preta-g", "quantity": 2}]
        assert "232,30" in page.locator(".shop-single-quote-line").inner_text()
        page.get_by_role("button", name="Adicionar ao carrinho").click()
        cart = page.evaluate("JSON.parse(localStorage.getItem('douglasShopCart_v2'))")
        assert any(x["id"] == "camiseta-salve-regina" and x["qty"] == 2 for x in cart)
        print("PASS: Salve Regina — tamanhos, subtotal, frete recolhível e carrinho")

        page.goto(BASE + "/pages/produto-loja.html?id=caneca-salve-regina-preta",
            wait_until="domcontentloaded")
        expect(page.get_by_role("link", name="Nossa Senhora", exact=True)).to_be_visible(timeout=12000)
        page.get_by_role("link", name="Nossa Senhora", exact=True).click()
        expect(page).to_have_url(re.compile("/pages/produto-caneca-salve-regina-pb[.]html"))
        print("PASS: alternativas de caneca navegáveis e sem habilitar cobrança")

        # Regressão para todos os artigos físicos.
        for pid,unit,unit_price in [
            ("camiseta-salve-regina","camiseta","109,90"),
            ("caneca-salve-regina-preta","caneca","49,90"),
            ("caneca-salve-regina-pb","caneca","49,90"),
            ("ecobag-salve-regina","ecobag","39,90"),
        ]:
            page.goto(BASE + "/pages/produto-loja.html?id=" + pid,
                      wait_until="domcontentloaded")
            root=page.locator("#shop-single-root")
            expect(root).to_have_class(re.compile("shop-single-physical"),timeout=12000)
            assert root.locator(".shop-single-excerpt").count()==0,pid
            assert root.locator(".shirt-seller").count()==0,pid
            assert root.locator(".shop-single-back").count()==0,pid
            assert root.locator(".shop-single-pricebox button").count()==0,pid
            assert root.locator(".shop-single-actions button").count()==2,pid
            expect(root.locator(".shop-single-quantity-group")).to_be_visible()
            expect(root.locator(".shop-single-quantity-subtotal")).to_contain_text(unit_price)
            freight=root.locator(".shop-single-freight-disclosure")
            expect(freight).to_be_visible()
            assert not freight.get_attribute("open"),pid
            assert root.locator(".shop-single-quantity-group").evaluate(
              "(el)=>getComputedStyle(el).display")=="flex",pid
            qty=root.locator(".shop-single-quantity-input")
            expect(qty).to_have_value("1")
            root.get_by_role("button",name="Aumentar quantidade").click()
            expect(qty).to_have_value("2")
            total={"109,90":"219,80","49,90":"99,80","39,90":"79,80"}[unit_price]
            expect(root.locator(".shop-single-quantity-subtotal")).to_contain_text(total)
            expect(root.get_by_role("button",name="Revisar 2 "+unit+"s")).to_be_visible()
            root.get_by_role("button",name="Diminuir quantidade").click()
            expect(qty).to_have_value("1")
            expect(root.get_by_role("button",name="Comprar agora",exact=True)).to_be_visible()
            assert root.get_by_role("button",name="Comprar agora",exact=True).count()==1
            assert root.get_by_role("button",name="Adicionar ao carrinho").count()==1
            if pid.startswith("caneca-"):
                assert root.locator(".shop-single-variant-chips button").count()==0,pid
                assert root.get_by_role("link",name="Nossa Senhora",exact=True).count()==1,pid
                assert root.get_by_role("link",name="Partitura Gregoriana",exact=True).count()==1,pid
            for width in (390,360):
                page.set_viewport_size({"width":width,"height":800})
                assert root.locator(".shop-single-summary").evaluate(
                    "(el)=>el.scrollWidth<=el.clientWidth+2"),(pid,width)
                expect(root.locator(".shop-single-quantity-input")).to_be_visible()
                assert root.get_by_role("button",name="Comprar agora",exact=True).count()==1
            page.set_viewport_size({"width":1280,"height":900})
        page.goto(BASE + "/pages/produto-loja.html?id=ecobag-salve-regina",
                  wait_until="domcontentloaded")
        for size in ("P","GG"):
            page.get_by_role("button",name=size,exact=True).click()
            expect(page.locator(".shop-single-price")).to_contain_text("a confirmar")
            expect(page.get_by_role("button",name="Adicionar ao carrinho")).to_be_disabled()
        page.get_by_role("button",name="M",exact=True).click()
        expect(page.locator(".shop-single-price")).to_contain_text("39,90")
        print("PASS: 4 fichas compactas, quantidades e subtotais; canecas sem tamanho único; ecobag pendente bloqueada")

        # Boné Cor Iesu: mesmo seletor circular da camiseta; as imagens
        # e o SKU acompanham a cor, sem duplicar botões de variação.
        page.goto(BASE + "/pages/produto-loja.html?id=bone-cor-iesu-sacratissimum",
                  wait_until="domcontentloaded")
        expect(page.locator(".shop-single-color-choice")).to_have_count(2)
        expect(page.locator(".shop-single-variant-chips button")).to_have_count(0)
        expect(page.locator(".shop-single-color-selected-name")).to_have_text("Preto")
        native=page.locator(".shop-single-native-select")
        expect(native).to_have_value("preto")
        expect(page.locator(".shop-single-price")).to_contain_text("79,90")
        swatches=page.locator(".shop-single-color-swatch")
        assert swatches.count()==2
        assert swatches.nth(0).evaluate(
            "(el)=>el.style.getPropertyValue('--color-swatch')")=="#202024"
        assert swatches.nth(1).evaluate(
            "(el)=>el.style.getPropertyValue('--color-swatch')")=="#1d2b43"
        image=page.locator(".shop-single-image-clip > img")
        page.get_by_role("button",name="Selecionar cor Azul-escuro").click()
        expect(native).to_have_value("azul-escuro")
        expect(page.locator(".shop-single-color-selected-name")).to_have_text("Azul-escuro")
        expect(page.get_by_role("button",name="Selecionar cor Azul-escuro")).to_have_attribute(
            "aria-pressed","true")
        expect(image).to_have_attribute("src",re.compile("bone-cor-iesu-modelo-20261113"))
        # Galeria e opções de compra devem permanecer sincronizadas.
        page.get_by_role("button",name="Selecionar cor Preto").click()
        expect(native).to_have_value("preto")
        expect(image).to_have_attribute("src",re.compile("bone-sagrado-coracao-capa"))
        page.get_by_role("button",name="Próxima imagem",exact=True).click()
        expect(native).to_have_value("azul-escuro")
        expect(page.locator(".shop-single-color-selected-name")).to_have_text("Azul-escuro")
        for width in (390,360):
            page.set_viewport_size({"width":width,"height":800})
            assert page.locator(".shop-single-summary").evaluate(
                "(el)=>el.scrollWidth<=el.clientWidth+2"),width
        page.set_viewport_size({"width":1280,"height":900})
        print("PASS: boné com cores circulares iguais à camiseta, foto e SKU sincronizados")

        # Os livros continuam no fluxo de livrarias, sem carrinho físico.
        page.goto(BASE + "/pages/produto-loja.html?id=o-canto-como-mistica",
                  wait_until="domcontentloaded")
        book=page.locator("#shop-single-root")
        expect(book.locator(".shop-single-partners")).to_be_visible(timeout=12000)
        assert not book.evaluate("(e)=>e.classList.contains('shop-single-physical')")
        assert book.locator(".shop-single-quantity-input").count()==0
        print("PASS: compra de livros sem alterações")


        # Cor Iesu: um único Comprar agora, campo de quantidade funcional
        # com subtotal e carrinho, sem permitir pagamento indevido de lote.
        page.goto(BASE + "/pages/produto-loja.html?id=camiseta-cor-iesu-sacratissimum",
            wait_until="domcontentloaded")
        buy = page.get_by_role("button",name="Comprar agora",exact=True)
        expect(buy).to_be_visible(timeout=12000)
        assert buy.count()==1, "A página deve ter um único botão Comprar agora"
        assert buy.is_enabled()
        assert page.locator(".shop-single-top-buy").count()==0
        assert page.locator(".shop-single-pricebox button").count()==0
        assert page.locator(".shop-single-variant-chip").count()==4
        assert page.locator(".shop-single-color-choice").count()==11
        expect(page.locator(".shop-single-quantity-group")).to_be_visible()
        quantity_cor=page.locator(".shop-single-quantity-input")
        expect(quantity_cor).to_have_attribute("type","number")
        expect(quantity_cor).to_have_value("1")
        expect(page.locator(".shop-single-quantity-subtotal")).to_contain_text("109,90")
        assert page.locator(".shop-single-excerpt").count()==0, "Texto completo já está abaixo"
        assert page.locator(".shop-single-freight-disclosure").count()==1
        expect(page.locator(".shop-single-freight-disclosure .shop-single-shipping input")).not_to_be_visible()
        page.locator(".shop-single-freight-disclosure > summary").click()
        expect(page.locator(".shop-single-freight-disclosure .shop-single-shipping input")).to_be_visible()
        page.locator(".shop-single-freight-disclosure > summary").click()
        page.locator('[aria-label="Selecionar cor Bordô"]').click()
        page.locator(".shop-single-native-select").select_option("GG")
        expect(page.locator(".shop-single-price")).to_contain_text("109,90")
        expect(buy).to_be_visible()
        assert page.evaluate("""() => {
          const form=document.querySelector('.shop-single-form');
          const color=document.querySelector('.shop-single-color-group');
          const size=document.querySelector('.shop-single-variant-group');
          const actions=document.querySelector('.shop-single-actions');
          const freight=document.querySelector('.shop-single-freight-disclosure');
          return (form.compareDocumentPosition(freight)&4)!==0 &&
            (color.compareDocumentPosition(size)&4)!==0 &&
            (size.compareDocumentPosition(actions)&4)!==0;
        }"""), "Ordem: cor, tamanho, compra, frete"
        page.get_by_role("button",name="Aumentar quantidade").click()
        expect(quantity_cor).to_have_value("2")
        expect(page.locator(".shop-single-quantity-subtotal")).to_contain_text("219,80")
        review=page.get_by_role("button",name="Revisar 2 camisetas")
        expect(review).to_be_visible()
        assert page.get_by_role("button",name="Comprar agora",exact=True).count()==0
        page.get_by_role("button",name="Diminuir quantidade").click()
        expect(quantity_cor).to_have_value("1")
        expect(page.locator(".shop-single-quantity-subtotal")).to_contain_text("109,90")
        expect(buy).to_be_visible()
        page.get_by_role("button",name="Aumentar quantidade").click()
        review.click()
        expect(page).to_have_url(re.compile("/pages/cart[.]html"))
        cart=page.evaluate("JSON.parse(localStorage.getItem('douglasShopCart_v2'))")
        assert any(item["id"]=="camiseta-cor-iesu-sacratissimum" and
                   item["variant"]=="cor-iesu-bordo-gg" and item["qty"]==2
                   for item in cart),cart
        expect(page.locator(".cart-item").filter(has_text="Cor Iesu").locator(".cart-quantity-number")).to_have_text("2")
        # Pedido múltiplo não deve oferecer pagamento antes da homologação
        expect(page.locator("#cart-payment-explanation")).to_be_visible()
        page.goto(BASE + "/pages/produto-loja.html?id=camiseta-cor-iesu-sacratissimum",
                  wait_until="domcontentloaded")
        page.locator('[aria-label="Selecionar cor Bordô"]').click()
        page.locator(".shop-single-native-select").select_option("GG")
        buy=page.get_by_role("button",name="Comprar agora",exact=True)
        expect(buy).to_be_visible()
        for width in (390,360):
            page.set_viewport_size({"width":width,"height":800})
            expect(buy).to_be_visible()
            assert buy.count()==1
            columns=page.locator(".shop-single-color-choices").evaluate(
                "(el)=>getComputedStyle(el).gridTemplateColumns.split(' ').length")
            assert columns==4,(width,columns)
            assert page.locator(".shop-single-summary").evaluate(
                "(el)=>el.scrollWidth <= el.clientWidth+2"),"Sem transbordamento horizontal"
        page.set_viewport_size({"width":1280,"height":900})
        print("PASS: campo 1–10, subtotal correto, revisão no carrinho e pagamento unitário preservado")

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
        buy.click()
        expect(page).to_have_url(re.compile(r"checkout-salve-regina[.]html[?]sku=cor-iesu-bordo-gg"))
        expect(page.locator("#checkout-container")).to_be_visible(timeout=15000)
        expect(page.locator("#checkout-product-name")).to_contain_text("Cor Iesu")
        print("PASS: compra única, carrinho preserva Bordô GG; checkout abre a cor certa")

        browser.close()


if __name__ == "__main__":
    main()

"""E2E do checkout de carrinho: CEP libera o frete sem fazer cobranças.

Executar com servidor local na porta 8765. Todas as APIs são simuladas no navegador.
"""
from __future__ import annotations

import json
from playwright.sync_api import expect, sync_playwright

BASE = "http://127.0.0.1:8765"
API_CORS = {"access-control-allow-origin": "*"}


def main() -> None:
    with sync_playwright() as play:
        browser = play.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        checkout_calls = []

        page.add_init_script(
            """localStorage.setItem('douglasShopCart_v2',
               JSON.stringify([{id:'camiseta-salve-regina',variant:'G',qty:2}]));"""
        )

        def readiness(route):
            route.fulfill(
                status=200, content_type="application/json", headers=API_CORS,
                body=json.dumps({
                    "checkoutEnabled": True, "multiCheckoutEnabled": True,
                    "paymentProvider": "infinitepay",
                    "availableSkus": ["salve-regina-preta-g"]
                })
            )

        def shipping(route):
            req = route.request.post_data_json
            zip_code = req["zipCode"]
            if zip_code == "11111111":
                route.fulfill(
                    status=503, content_type="application/json", headers=API_CORS,
                    body=json.dumps({"error": "shipping_provider_unavailable"})
                )
                return
            route.fulfill(
                status=200, content_type="application/json", headers=API_CORS,
                body=json.dumps({
                    "mode": "preview", "provisional": True, "checkoutEnabled": False,
                    "zipCode": zip_code, "items": req["items"],
                    "options": [{
                        "id": "carrier-test", "name": "Transportadora Teste",
                        "isActive": True, "shippingCost": 15.54, "deliveryTime": 5
                    }]
                })
            )

        def viacep(route):
            route.fulfill(
                status=200, content_type="application/json", headers=API_CORS,
                body=json.dumps({
                    "cep": "13218-752", "logradouro": "Rua Exemplo",
                    "bairro": "Centro", "localidade": "Jundiaí", "uf": "SP"
                })
            )

        def checkout(route):
            checkout_calls.append(route.request.url)
            route.fulfill(
                status=400, content_type="application/json", headers=API_CORS,
                body='{"error":"checkout_not_expected"}'
            )

        page.route("**/api/checkout/live/readiness", readiness)
        page.route("**/api/shipping/cart-preview", shipping)
        page.route("https://viacep.com.br/ws/**", viacep)
        page.route("**/api/checkout/live", checkout)

        page.goto(BASE + "/pages/checkout-carrinho.html", wait_until="domcontentloaded")
        expect(page.locator("#checkout-multi-container")).to_be_visible(timeout=15000)
        pay = page.locator("#checkout-multi-pay")
        zip_input = page.locator("#checkout-multi-form [name=zipCode]")

        expect(pay).to_be_disabled()
        expect(page.locator("#checkout-multi-total")).to_have_text("A calcular")
        zip_input.fill("13218-752")
        expect(page.locator("#checkout-multi-freight")).to_contain_text("15,54", timeout=15000)
        expect(page.locator("#checkout-multi-total")).to_contain_text("235,34")
        expect(pay).to_be_enabled()
        assert not checkout_calls, "A cotação não pode iniciar pagamento"
        print("PASS: CEP preenchido calcula frete, total e habilita botão automaticamente")

        # O evento change/blur após a busca não pode apagar uma cotação válida.
        zip_input.focus()
        zip_input.press("Tab")
        expect(pay).to_be_enabled()
        print("PASS: sair do CEP não invalida uma cotação válida")

        zip_input.fill("13218-75")
        expect(pay).to_be_disabled()
        expect(page.locator("#checkout-multi-total")).to_have_text("A calcular")
        print("PASS: CEP incompleto bloqueia pagamento e limpa total")

        zip_input.fill("11111-111")
        expect(page.locator("#checkout-multi-shipping-status")).to_contain_text(
            "Não foi possível calcular o frete", timeout=15000
        )
        expect(pay).to_be_disabled()
        print("PASS: falha de cotação não habilita pagamento incorreto")

        zip_input.fill("13218-752")
        expect(pay).to_be_enabled(timeout=15000)
        assert not checkout_calls, "Testes de frete não podem cobrar"
        print("PASS: usuário consegue tentar novamente com CEP corrigido")

        # O servidor simulado recusa o link. A loja NÃO pode apagar a cotação.
        fields = {
            "street": "Rua Exemplo", "number": "10",
            "neighborhood": "Centro", "city": "Jundiaí", "state": "SP",
            "name": "Cliente Teste", "email": "teste@example.com",
            "phone": "11988887777", "taxId": "12345678909",
        }
        for field, value in fields.items():
            page.locator('#checkout-multi-form [name="' + field + '"]').fill(value)
        page.locator('#checkout-multi-form [name="confirm"]').check()
        pay.click()
        expect(page.locator("#checkout-multi-pay-status")).to_contain_text(
            "Não foi possível iniciar o pagamento", timeout=15000
        )
        expect(pay).to_be_enabled()
        expect(page.locator("#checkout-multi-total")).to_contain_text("235,34")
        expect(page.locator("#checkout-multi-freight")).to_contain_text("15,54")
        assert len(checkout_calls) == 1
        print("PASS: erro do gateway preserva frete, total e botão de nova tentativa")
        browser.close()


if __name__ == "__main__":
    main()

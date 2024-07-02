include ../common.mk

.PHONY: build
build:
	$(NPM) hardhat compile --force --quiet
	$(NPM) build

.PHONY: deploy-localnet
deploy-localnet:
	$(NPM) hardhat --network sapphire-localnet deploy --viteenv ../frontend/.env.development

.PHONY: test-localnet
test-localnet:
	$(NPM) hardhat --network sapphire-localnet test

.PHONY: deploy-testnet
deploy-testnet:
	$(NPM) hardhat --network sapphire-testnet deploy --viteenv ../frontend/.env.production

.PHONY: test
test:
	$(NPM) test

.PHONY: clean
clean:
	rm -rf lib src/contracts abis artifacts cache

.PHONY: veryclean
veryclean:
	rm -rf node_modules

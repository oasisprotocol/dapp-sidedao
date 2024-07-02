build: node_modules
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@

clean:
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@

deploy: build
	$(MAKE) -C hardhat deploy-testnet
	$(MAKE) -C frontend build

node_modules: $(wildcard */package.json)
	pnpm install

veryclean: clean
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@
	rm -rf node_modules pnpm-lock.yaml

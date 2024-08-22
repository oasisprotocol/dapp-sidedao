build: node_modules
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@
	$(MAKE) -C frontend.demo $@

clean:
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@
	$(MAKE) -C frontend.demo $@

deploy: build
	$(MAKE) -C hardhat deploy-testnet
	$(MAKE) -C frontend $@
	$(MAKE) -C frontend.demo build

node_modules: $(wildcard */package.json)
	pnpm install

veryclean: clean
	$(MAKE) -C hardhat $@
	$(MAKE) -C contracts $@
	$(MAKE) -C frontend $@
	$(MAKE) -C frontend.demo $@
	rm -rf node_modules pnpm-lock.yaml

include ../common.mk

all: build

dev:
	$(NPM) $@

build:
	$(NPM) $@

build-staging:
	$(NPM) vite build -m staging

build-production:
	$(NPM) vite build -m production

clean:
	rm -rf dist

veryclean: clean
	rm -rf node_modules

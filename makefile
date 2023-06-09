default: help
nvm:
	. ${NVM_DIR}/nvm.sh && nvm use && $(CMD)
clean:
	rm -rf dist
build: clean ## Build a production build
	make nvm CMD="npm run build"
install: ## Install all CDK dependencies
	make nvm CMD="npm install"
help: ## Display a list of commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sed 's/makefile://g' | awk 'BEGIN {FS = ":[^:]*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

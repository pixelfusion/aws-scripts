define NVM_SETUP
	. $(NVM_DIR)/nvm.sh && nvm use $(NODE_VERSION)
endef

default: help
clean:
	rm -rf dist
build: clean ## Build a production build
	@$(NVM_SETUP) && npm run build
install: ## Install all CDK dependencies
	@$(NVM_SETUP) && npm install
lint: ## Lint the code
	@$(NVM_SETUP) && npm run lint
fix: ## Fix linting issues
	@$(NVM_SETUP) && npm run prettier
help: ## Display a list of commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sed 's/makefile://g' | awk 'BEGIN {FS = ":[^:]*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

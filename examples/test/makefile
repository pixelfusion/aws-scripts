include .env
export

# Set default variables
APP_ENV ?= uat
AWS_PROFILE ?= aws-cdk-test

default: help
nvm:
	. ${NVM_DIR}/nvm.sh && nvm use && $(CMD)
install: ## Install all CDK dependencies
	make nvm CMD="npm install"
update: ## Update all CDK dependencies
	make nvm CMD="npm update"
secrets: ## Bootstrap secrets
	make nvm CMD="npm run secrets"
bootstrap-account: ## Bootstrap cdk. Only needs to be run once each account.
	make nvm CMD="npx cdk bootstrap --profile=$(AWS_PROFILE) --all"
bootstrap-cicd: ## Bootstrap cdk for this application. Sets up
	make nvm CMD="npx cdk deploy --profile=$(AWS_PROFILE) CDKTest-$(APP_ENV)-bootstrap"
diff: ## Compare deployed stack with current state
	make nvm CMD="npx cdk diff --profile=$(AWS_PROFILE) CDKTest-$(APP_ENV)-admin"
synth: ## Emits the synthesized CloudFormation template
	make nvm CMD="npx cdk synth --profile=$(AWS_PROFILE) CDKTest-$(APP_ENV)-admin"
deploy: ## Deploy this stack to your default AWS account/region from local
	make nvm CMD="npx cdk deploy --profile=$(AWS_PROFILE) CDKTest-$(APP_ENV)-admin"
help: ## Display a list of commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sed 's/makefile://g' | awk 'BEGIN {FS = ":[^:]*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

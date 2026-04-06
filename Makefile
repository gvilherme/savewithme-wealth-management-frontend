IMAGE   = node:lts-alpine
PROJECT = savewithme-frontend
MODULES = $(PROJECT)-node-modules
PORT    = 5173

# Prevents Git Bash on Windows from converting /app to C:/Program Files/Git/app
DOCKER  = MSYS_NO_PATHCONV=1 docker

.PHONY: dev build install clean help

dev: ## Sobe o dev server em localhost:5173 (API → localhost:8080)
	@if [ ! -f .env.local ]; then \
		echo "Erro: .env.local nao encontrado."; \
		echo "Copie o exemplo e preencha as credenciais do Supabase:"; \
		echo "  cp .env.example .env.local"; \
		exit 1; \
	fi
	$(DOCKER) run --rm -it \
		-v "$(CURDIR):/app" \
		-v "$(MODULES):/app/node_modules" \
		-w /app \
		-p $(PORT):$(PORT) \
		--env-file .env.local \
		-e VITE_API_URL=http://localhost:8080 \
		$(IMAGE) \
		sh -c "npm install --silent && npx vite --host 0.0.0.0 --port $(PORT)"

install: ## Instala dependencias no volume Docker
	$(DOCKER) run --rm \
		-v "$(CURDIR):/app" \
		-v "$(MODULES):/app/node_modules" \
		-w /app \
		$(IMAGE) \
		npm install

build: ## Build de producao
	$(DOCKER) run --rm \
		-v "$(CURDIR):/app" \
		-v "$(MODULES):/app/node_modules" \
		-w /app \
		$(IMAGE) \
		npm run build

clean: ## Remove o volume de node_modules
	docker volume rm $(MODULES) 2>/dev/null || true

help: ## Lista os comandos disponiveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

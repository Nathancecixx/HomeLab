-include .env
export

up:
	docker compose up -d --build

up-pi:
	docker compose -f docker-compose.pi.yml up -d --build

down:
	docker compose down

down-pi:
	docker compose -f docker-compose.pi.yml down

restart:
	docker compose down
	docker compose up -d --build

restart-pi:
	docker compose -f docker-compose.pi.yml down
	docker compose -f docker-compose.pi.yml up -d --build

logs:
	docker compose logs -f dashboard

logs-pi:
	docker compose -f docker-compose.pi.yml logs -f dashboard

config:
	docker compose config

config-pi:
	docker compose -f docker-compose.pi.yml config

ps:
	docker compose ps

health:
	curl -fsS http://127.0.0.1:$(HTTP_PORT)/api/health

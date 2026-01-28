.PHONY: dev build run batch build-batch migrate-up migrate-down test clean

# Development
dev:
	go run cmd/server/main.go

# Build
build:
	go build -o bin/sherpa-backend cmd/server/main.go

# Batch (週次クリーンアップ: 論理削除済みチャンネル等の物理削除)
batch:
	go run ./cmd/batch

build-batch:
	go build -o bin/batch ./cmd/batch

# Run
run:
	./bin/sherpa-backend

# Database setup
setup-db:
	chmod +x scripts/setup_db.sh && ./scripts/setup_db.sh

# Database migrations (using psql)
migrate-up:
	@if [ -f .env ]; then \
		export $$(cat .env | grep -v '^#' | xargs); \
		psql -h $$DB_HOST -p $$DB_PORT -U $$DB_USER -d $$DB_NAME -f migrations/001_initial_schema.sql; \
	else \
		echo "Error: .env file not found"; \
	fi

# Testing
test:
	go test ./...

# Clean
clean:
	rm -rf bin/
	go clean

BINARY   = offat-x
VERSION  = v1.0.0
PKG      = github.com/offat-x/offat-x

.PHONY: build run test clean tidy docker lint

## build: compile the binary for the current platform
build:
	go build -ldflags="-X main.Version=$(VERSION)" -o bin/$(BINARY) ./cmd/offat-x/

## run: build and run with a sample spec
run: build
	./bin/$(BINARY) -h

## test: run all unit tests
test:
	go test -v ./...

## tidy: tidy and vendor dependencies
tidy:
	go mod tidy

## clean: remove build artifacts
clean:
	rm -rf bin/

## docker: build Docker image
docker:
	docker build -t offat-x:$(VERSION) .

## lint: run golangci-lint
lint:
	golangci-lint run ./...

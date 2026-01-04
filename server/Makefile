.PHONY: dev build clean build-all

# 开发运行
dev:
	go run main.go

# 当前平台构建
build:
	go build -o bin/snail-server main.go

# 跨平台构建（用于 Tauri sidecar）
build-all: clean
	mkdir -p bin
	# macOS Intel
	GOOS=darwin GOARCH=amd64 go build -o bin/snail-server-x86_64-apple-darwin main.go
	# macOS Apple Silicon
	GOOS=darwin GOARCH=arm64 go build -o bin/snail-server-aarch64-apple-darwin main.go
	# Windows
	GOOS=windows GOARCH=amd64 go build -o bin/snail-server-x86_64-pc-windows-msvc.exe main.go
	# Linux
	GOOS=linux GOARCH=amd64 go build -o bin/snail-server-x86_64-unknown-linux-gnu main.go

clean:
	rm -rf bin/

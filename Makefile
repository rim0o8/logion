# bunのパスを定義
BUN := $(shell command -v bun 2> /dev/null)
DOCKER := $(shell command -v docker 2> /dev/null)
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)

# if bun command is not available, install it
ifeq ($(BUN),)
	BUN_INSTALL_CMD := $(shell command -v curl 2> /dev/null)
	ifeq ($(BUN_INSTALL_CMD), )
		$(error "curl command not available, please install curl")
	endif
	BUN_INSTALL_CMD_CMD += "-fsSL https://bun.sh/install | bash"
endif

# if docker-compose command is not available, install it
ifeq ($(DOCKER_COMPOSE),)
	DOCKER_COMPOSE_INSTALL_CMD := $(shell command -v curl 2> /dev/null)
	ifeq ($(DOCKER_COMPOSE_INSTALL_CMD), )
		$(error "curl command not available, please install curl")
	endif
	DOCKER_COMPOSE_INSTALL_CMD_CMD += "-L https://github.com/docker/compose/release/download/1.6.2/docker-compose-`uname -s`-`uname-m` > /usr/local/bin/docker-compose"
endif

# if docker command is not available, install it
ifeq ($(DOCKER),)
	DOCKER_INSTALL_CMD := $(shell command -v curl 2> /dev/null)
	ifeq ($(DOCKER_INSTALL_CMD), )
		$(error "curl command not available, please install curl")
	endif
	DOCKER_INSTALL_CMD += "-fsSL https://get.docker.com | sh"
endif

.PHONY: dev fe/install fe/dev fe fe/script fe/lint fe/format fe/storybook fe/build fe/build/docker
.SILENT: fe/install fe/dev fe fe/script fe/lint fe/format fe/storybook fe/build fe/build/docker
dev: fe/dev

fe/install:
	cd frontend && $(BUN) install
fe/dev:
	cd frontend && $(BUN) install && $(BUN) dev
fe:	# c: command line
	cd frontend && $(BUN) run $(c)
fe/script:	# s: script name
	cd frontend && $(BUN) run $(s)
fe/lint:
	cd frontend && $(BUN) install && $(BUN) lint --fix
fe/format:
	cd frontend && $(BUN) install && $(BUN) format
fe/storybook:
	cd frontend && $(BUN) install && $(BUN) storybook
fe/build:
	cd frontend && $(BUN) install && $(BUN) run build
fe/build/docker:
	cd frontend && $(DOCKER) build -t prod -f Dockerfile.prod .

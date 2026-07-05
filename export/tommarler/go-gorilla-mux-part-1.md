---
title: "What is Gorilla Mux? (Go HTTP Routing — Part 1)"
description: "Install Gorilla Mux, create a NewRouter, and add path variables in Go — step-by-step with curl examples."
publishedAt: "2026-07-05"
tags: [go, gorilla-mux, http, tutorials]
---

Happy Monday everyone — thought I'd kick off the week with something I've been using on a small Go API lately.

Go's standard library gives you `net/http`, but once your API grows beyond a handful of routes, handler wiring gets messy and path variables become awkward. Gorilla Mux is the router most Go teams reach for. In this series I'll walk through it step by step — starting from a blank module today.

When you finish reading this series you will have a small REST API with named routes, path variables, and middleware.

## What is Gorilla Mux?

If you've only used `http.HandleFunc`, you register paths as plain strings with no variables and no method filtering. Gorilla Mux adds a `Router` with named routes, HTTP method matching, and path parameters — without pulling in a full web framework.

Install it in your module:

```bash
go get -u github.com/gorilla/mux
```

<!-- image: go.mod showing gorilla/mux dependency -->

## How do you create a NewRouter?

Create a `main.go` with a minimal server:

```go
package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprint(w, "ok")
	}).Methods("GET")

	http.ListenAndServe(":8080", r)
}
```

Run it and hit the health endpoint:

```bash
go run .
curl localhost:8080/health
```

<!-- image: terminal showing curl 200 OK response -->

You should see `ok` printed back — your router is live.

## Can a path have a variable?

Yes. Register a route with `{id}` and read it with `mux.Vars`:

```go
r.HandleFunc("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	fmt.Fprintf(w, `{"id":"%s"}`, vars["id"])
}).Methods("GET")
```

Test it:

```bash
curl localhost:8080/users/42
```

<!-- image: curl output showing {"id":"42"} -->

## Recap

Today we installed Gorilla Mux, stood up a `NewRouter` with a health check, and added a path-variable route you can curl immediately.

In Part 2 we'll add subrouters and middleware so your API stays organized as it grows. See you in the next article.

Let me know what you think — leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Gorilla Mux on GitHub: https://github.com/gorilla/mux

I have been wiring up a small Go API that talks to a few external services, and I kept hard-coding query strings instead of clean path segments. Gorilla Mux makes path variables straightforward — I wanted to see how little code it takes to read a URL param and return JSON.

When you finish reading this article you will have a tiny Go server with one route that captures `{id}` from the path and echoes it back with `curl`.

## Why reach for Gorilla Mux over raw net/http?

`http.HandleFunc` works until you need `/users/42` and `/users/99` to hit the same handler with different IDs. You can parse `r.URL.Path` by hand, but it gets brittle fast. Gorilla Mux lets you declare `{id}` in the route pattern and pull it out with `mux.Vars(r)`.

Start a module if you do not have one yet:

```bash
mkdir mux-params-demo && cd mux-params-demo
go mod init example.com/mux-params-demo
go get github.com/gorilla/mux
```

[Screenshot: terminal showing go mod init and go get succeeding]

## How do you register a route with a path variable?

Create `main.go`:

```go
package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()

	r.HandleFunc("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := mux.Vars(r)["id"]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"id": id})
	}).Methods("GET")

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
```

The `{id}` in the path is the variable name. `mux.Vars(r)` returns a map keyed by those names.

[Screenshot: main.go open in editor with the route highlighted]

## Can you hit it from the terminal?

Run the server in one tab:

```bash
go run .
```

In another:

```bash
curl -s localhost:8080/users/42
```

You should see:

```json
{"id":"42"}
```

Try a different value — `curl -s localhost:8080/users/alice` — and the JSON updates without changing your handler code.

[Screenshot: two terminals — server log and curl output side by side]

## What about multiple variables in one path?

You can stack them. Add a second route to the same router:

```go
r.HandleFunc("/orgs/{org}/repos/{repo}", func(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	json.NewEncoder(w).Encode(map[string]string{
		"org":  vars["org"],
		"repo": vars["repo"],
	})
}).Methods("GET")
```

```bash
curl -s localhost:8080/orgs/pokepitchshop/repos/Draftsmith
```

Each `{name}` in the pattern becomes a key in `mux.Vars(r)`. That is the core idea — everything else in Gorilla Mux builds on this.

[Screenshot: curl output showing org and repo keys]

## Recap

You stood up a minimal Gorilla Mux router, registered paths with `{variables}`, and read them with `mux.Vars(r)` — verified with `curl` on your own machine.

Let me know what you think — leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Gorilla Mux on GitHub: https://github.com/gorilla/mux
- My Gorilla Mux series Part 1: `go-gorilla-mux-part-1` (coming soon on tommarler.com)

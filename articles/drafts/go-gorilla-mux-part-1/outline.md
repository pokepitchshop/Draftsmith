# Outline: What is Gorilla Mux? (Go HTTP Routing — Part 1)

**Slug:** `go-gorilla-mux-part-1`
**Series:** go-gorilla-mux (Part 1 of 3)
**Estimated read time:** 4 min
**Target channels:** medium, tommarler

---

## Opening

### Context and motivation (problem-first)

Go's standard library gives you `net/http`, but once your API grows beyond a handful of routes, you end up with messy handler wiring and no clean way to add path variables. Gorilla Mux is the router most Go teams reach for — I'll show you how to get started without drowning in boilerplate.

### What you'll learn

When you finish this series you will have a small REST API with named routes, path variables, and middleware — starting from a blank Go module in this article.

---

## Sections

### What is Gorilla Mux?

**Purpose:** Define the library and why it beats raw `http.HandleFunc` for real projects.

**Steps:**
1. Explain what a router does vs. the stdlib default
2. Show the Gorilla Mux module path and one-line install

**Code/CLI to include:**
- `go get -u github.com/gorilla/mux`

**Screenshot placeholder:**
- `[Screenshot: go.mod showing gorilla/mux dependency]`

---

### How do you create a NewRouter?

**Purpose:** Minimal working server with one route.

**Steps:**
1. Create `main.go` with `mux.NewRouter()`
2. Register a GET `/health` handler
3. Run the server and curl the endpoint

**Code/CLI to include:**
- `go run .`
- `curl localhost:8080/health`

**Screenshot placeholder:**
- `[Screenshot: terminal showing curl 200 OK response]`

---

### Can a path have a variable?

**Purpose:** Introduce `{id}` style path params with `mux.Vars(r)`.

**Steps:**
1. Add `GET /users/{id}` route
2. Read the id from `mux.Vars(r)`
3. Return JSON with the id

**Code/CLI to include:**
- `curl localhost:8080/users/42`

**Screenshot placeholder:**
- `[Screenshot: curl output showing {"id":"42"}]`

---

## Closing

### Recap

- Installed Gorilla Mux and created a `NewRouter`
- Registered a health check and a path-variable route
- Confirmed both endpoints with curl

### Next part (series only)

In Part 2 we'll add subrouters and middleware so your API stays organized as it grows. See you in the next article.

### Related links

- Gorilla Mux GitHub: https://github.com/gorilla/mux

---

## Draft notes

- **TL;DR candidate:** Gorilla Mux gives Go devs named routes and path variables in a few lines.
- **GitHub repo to link:** create `go-gorilla-mux-demo` repo with Part 1 code
- **Accuracy checks:** verify module path and `mux.Vars` API against current docs

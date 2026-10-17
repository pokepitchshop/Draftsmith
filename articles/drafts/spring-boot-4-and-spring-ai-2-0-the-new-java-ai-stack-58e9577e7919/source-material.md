---
source_url: https://medium.com/@chrisvanbreeden/spring-boot-4-and-spring-ai-2-0-the-new-java-ai-stack-58e9577e7919
link_type: blog
title: "https://medium.com/@chrisvanbreeden/spring-boot-4-and-spring-ai-2-0-the-new-java-ai-stack-58e9577e7919"
ingested_at: 2026-07-11T19:48:01.069Z
engine: jina
---

Published Time: 2026-04-05T11:51:50Z

[![Image 1: Chris van Breeden](https://miro.medium.com/v2/resize:fill:32:32/1*eBEUzG_xi0BEduP7eZ9FOw.jpeg)](https://medium.com/@chrisvanbreeden?source=post_page---byline--58e9577e7919---------------------------------------)

6 min read

Apr 5, 2026

Press enter or click to view image in full size

![Image 2](https://miro.medium.com/v2/resize:fit:700/1*GF1-Pd0jv-sfwHjeH31hYg.avif)

The Spring ecosystem just crossed an inflection point. With Spring Boot 4.0 shipping in November 2025 and Spring AI 2.0 reaching its third milestone in March 2026, Java developers now have a production-grade, Spring-native path to building AI applications without a Python detour. If you’re a senior Java developer who’s been watching the AI tooling space from the sidelines, this is the stack that should pull you in.

Let’s break down what changed, what matters, and how these pieces fit together.

## Spring Boot 4: The Foundation Gets Sharper

Spring Boot 4 is not a revolutionary rewrite. It’s a disciplined modernization that cleans up accumulated debt, aligns with JDK 25+ capabilities, and introduces several features that directly reduce boilerplate in API-heavy applications.

## First-Class API Versioning

Before Boot 4, versioning REST APIs meant rolling your own convention: separate URL paths, custom headers, or media types, each wired by hand. Spring Boot 4 (built on Spring Framework 7) makes versioning a first-class citizen.

@GetMapping(url = "/accounts/{id}", version = "1.0")

public AccountV1 getAccountV1(@PathVariable Long id) {

 return accountService.findV1(id);

}@GetMapping(url = "/accounts/{id}", version = "1.1")

public AccountV1_1 getAccountV1_1(@PathVariable Long id) {

 return accountService.findV1_1(id);

}
The framework supports path, header, query parameter, and media type versioning strategies, configurable via `spring.mvc.apiversion.*` properties. Built-in deprecation handling complies with RFC 9745. Both `RestClient` and `WebClient` use the new `ApiVersionInserter` on the client side, keeping API evolution consistent across producers and consumers.

## Declarative HTTP Service Clients

Feign-style declarative clients are now native to Spring Boot. Annotate a Java interface; Spring generates the implementation:

@HttpExchange("/api/users")

public interface UserClient { @GetExchange("/{id}")

 User getUser(@PathVariable Long id); @PostExchange

 User createUser(@RequestBody User user);

}
The new HTTP Interface Groups feature allows applications to configure many HTTP interface clients at once, sharing a single `RestClient`. For microservice architectures with dozens of service-to-service calls, this dramatically reduces wiring boilerplate.

## Built-in Resilience

Basic resilience patterns are now baked into `spring-context` itself. The `spring-boot-starter-resilience` module provides `@Retryable` (with exponential back-off and jitter) and `@ConcurrencyLimit` (bulkhead pattern) as native decorators. No Resilience4j or Spring Retry dependency required for simple cases.

@Retryable(maxAttempts = 3, backoff = @Backoff(delay = 200, multiplier = 2.0))

public LlmResponse callModel(String prompt) {

 return llmClient.chat(prompt);

}
For AI workloads where model API calls are inherently unreliable, having retry with jitter built into the framework is a practical win.

## Other Highlights

*   Jackson 3 migration: Package relocation from `com.fasterxml.jackson` to `tools.jackson`. `JsonMapper` replaces `ObjectMapper` with immutability and format-specific mappers. Default serialization switches to alphabetical property sorting and ISO-8601 dates.
*   Modularized auto-configuration: The monolithic `spring-boot-autoconfigure` JAR is split into technology-specific modules (e.g., `spring-boot-autoconfigure-data-jpa`), reducing classpath scanning overhead and improving startup time.
*   JSpecify null safety: Standardized `@Nullable` and `@NonNull` annotations replace the previous JSR-305/JetBrains mix. Kotlin 2 translates these automatically into Kotlin nullability.
*   Jakarta EE 11 baseline: Servlet 6.1, updated persistence and messaging APIs.
*   Virtual threads: Enable with `spring.threads.virtual.enabled=true` on JDK 25+.

## Spring AI 2.0: From Experiment to Platform

Spring AI 1.0 proved the concept: a Spring-native abstraction layer over LLM providers with RAG support and tool calling. Spring AI 2.0, now at Milestone 3 (released March 17, 2026), builds on Spring Boot 4 and transforms from an integration library into a full AI application platform.

## MCP Integration Moves to Core

The Model Context Protocol (MCP) support that started in the community has been merged into Spring AI core. MCP annotations are now first-class, and Spring-specific MCP transport implementations have moved from the MCP Java SDK into the Spring AI project itself.

## Get Chris van Breeden’s stories in your inbox

Join Medium for free to get updates from this writer.

Remember me for faster sign in

This means a Spring Boot application can simultaneously:

*   Act as an MCP client, connecting to external MCP servers (filesystem tools, database access, third-party APIs)
*   Act as an MCP server, exposing its own business logic as MCP-compliant tools

Transport options include Streamable HTTP (the modern default), SSE for backward compatibility, and stdio for local process tools.

@Bean

McpClient fileSystemMcp() {

 return McpClient.builder()

 .transport(StreamableHttpMcpTransport.builder()

 .url("http://localhost:3001/mcp")

 .build())

 .build();

}
The `McpClientCustomizer` interface (new in M3) enables fine-grained customization of named client components, and metadata can now be specified on tools and resources, which is essential for building rich UIs as part of an MCP server.

## 20+ Model Providers

Spring AI 2.0 supports over 20 model backends out of the box: OpenAI, Anthropic, Google Vertex AI, AWS Bedrock, Azure OpenAI, Ollama, Mistral, HuggingFace, and more. The abstraction layer means swapping providers is a configuration change, not a code change.

## The Advisors API: Structured RAG and Memory

The Advisors API provides a composable pipeline for request/response transformation. Think of it as middleware for AI calls:

*   RAG advisors: Automatically retrieve relevant context from vector stores before sending prompts
*   Memory advisors: Maintain conversation history across requests
*   Custom advisors: Implement guardrails, logging, token budgeting, or any cross-cutting concern

Advisors compose naturally with Spring’s dependency injection, so you wire them as beans and let the framework manage lifecycle.

## Tool Calling

Spring AI 2.0 treats Spring Beans as tools. Annotate a method, and it becomes callable by the model:

@Component

public class OrderTools { @Tool("Look up order status by order ID")

 public OrderStatus getOrderStatus(String orderId) {

 return orderRepository.findStatus(orderId);

 }

}
The framework handles JSON schema generation, argument marshaling, and response formatting. Combined with MCP, this creates a powerful composition model where AI agents can discover and invoke tools both locally and remotely.

## The Comparison: Spring AI vs LangChain4j vs Direct API Calls

With both Spring AI and LangChain4j maturing rapidly, Java teams face a real choice. Here’s how they stack up as of early 2026:

## Spring AI 2.0

Best for: Teams already invested in Spring Boot who want AI as a natural extension of their existing architecture.

*   Opinionated composition via Advisors, Spring Beans as tools, Boot lifecycle integration
*   MCP client and server in one application
*   Growing provider support (20+), catching up with LangChain4j
*   Tight integration with Spring Security, Spring Data, Actuator metrics
*   Current status: 2.0.0-M3 (not yet GA; milestone releases)

## LangChain4j (v1.10+)

Best for: Teams that need maximum flexibility, support the widest range of providers, or aren’t on Spring Boot.

*   Framework-agnostic: works with Quarkus, Micronaut, Helidon, or plain Java
*   More LLM and vector store providers currently supported
*   “Lego approach” with granular building blocks (DocumentLoader, DocumentSplitter, EmbeddingStore, ChatMemory, AiServices)
*   Production-proven at MuleSoft (Salesforce), Deutsche Telekom, and Apache Camel
*   200+ contributors including engineers from Google, Red Hat, and JetBrains
*   Full MCP client support via `langchain4j-mcp`

## Direct API Calls

Best for: Simple use cases, tight control over prompts and responses, or when you need features before frameworks catch up.

*   Zero abstraction overhead
*   Full control over request construction and error handling
*   No dependency on framework release cycles
*   Becomes unwieldy past a single model + single prompt pattern

## The Verdict

If you’re building on Spring Boot (and statistically, you probably are), Spring AI 2.0 is the natural choice once it reaches GA. The framework integration is unmatched: security, configuration, testing, metrics all come for free. For teams that need production stability today or operate outside the Spring ecosystem, LangChain4j is battle-tested and more mature. Direct API calls remain valid for prototypes and narrow use cases.

The good news: these are not mutually exclusive. LangChain4j works as a Spring Bean, and Spring AI’s abstractions don’t prevent direct API calls when needed.

## The 4.1 Horizon

Spring Boot 4.1.0, currently at Milestone 3 (March 2026), previews what’s next:

*   AMQP 1.0 support: Auto-configuration for `AmqpConnectionFactory` and `AmqpClient`, alongside the new `@AmqpListener` annotation
*   Spring Batch MongoDB: A new `spring-boot-batch-data-mongodb` module for MongoDB-backed batch processing
*   Spring Data 2026.0: Redis listener annotations, MongoDB bulk operations, Redis 8.4 support
*   Spring Security 7.1.0: New `MessageExpressionAuthorizationManager`, CVE-2026-22732 patch for HTTP header caching exposure

## Getting Started

For teams ready to explore the new stack:

1.   Start with Spring Boot 4.0.5 (current stable) and add `spring-ai-bom` for Spring AI dependencies
2.   Pick a model provider: Ollama for local development, OpenAI or Anthropic for production
3.   Add MCP incrementally: start as an MCP client consuming external tools, then expose your own services as MCP tools
4.   Use the Advisors API for RAG. It’s the cleanest path to retrieval-augmented generation in the Java ecosystem

The migration from Spring Boot 3.x is well-documented. The recommended path: upgrade to 3.5 first, resolve deprecation warnings, then move to 4.0.

## Bottom Line

Spring Boot 4 and Spring AI 2.0 represent the maturation of Java’s AI story. The platform play is clear: declarative HTTP clients for service integration, native resilience for unreliable model APIs, MCP for tool interoperability, and the Advisors API for composable AI pipelines. For the first time, a Java team can build a production AI application without leaving the framework they already know.

The stack isn’t fully GA yet. Spring AI 2.0 is at M3 and likely months from a stable release. But the direction is set, the ecosystem is converging, and the code you write today against these APIs will be the code you run in production.

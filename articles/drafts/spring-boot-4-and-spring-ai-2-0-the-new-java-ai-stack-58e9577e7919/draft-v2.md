Happy Saturday everyone — our platform team is drafting an AI roadmap, and the real question is not "Python or Java?" It is whether we stay on Spring Boot 3 with hand-rolled OpenAI calls, or standardize on Spring Boot 4 with Spring AI 2.0.

I read a few overview posts and the official release notes, then spun up a greenfield repo to see if the stack feels production-ready. This article is me reporting back from that spike.

When you finish reading this article you will know which versions to pair, how to bootstrap a Boot 4 + Spring AI 2.0 project from scratch, and whether I would bet a real service on it today.

## What does Spring Boot 4 change for AI workloads?

Spring Boot 4 is not a rewrite. It is a cleanup pass that starts to matter once you call external model APIs from Java services.

Three things stood out in the migration guides:

- **Built-in resilience** — `@Retryable` and `@ConcurrencyLimit` ship in `spring-boot-starter-resilience`, so a flaky LLM HTTP call can get exponential back-off without Resilience4j for the simple case.
- **Declarative HTTP clients** — `@HttpExchange` interfaces cut Feign-style boilerplate when your app talks to internal REST services alongside the model.
- **Virtual threads** — set `spring.threads.virtual.enabled=true` on JDK 21+ and blocking model calls stop tying up platform threads as aggressively.

I am not migrating Jackson 3 package names in this spike. That is a separate afternoon I am not looking forward to :)

## Where does Spring AI 2.0 sit on that foundation?

Spring AI 1.x proved you could wrap chat models in Spring beans. Spring AI 2.0 is built for Boot 4 and pushes into platform territory — MCP client/server support, composable advisors for RAG and memory, and `@Tool` methods that turn Spring beans into model-callable functions.

The version matrix is straightforward: **Spring AI 2.0.x targets Spring Boot 4.0.x and 4.1.x**. Both are on Maven Central — no milestone repository unless you want snapshots.

I am not wiring MCP or advisors here. I wanted the smallest stack proof first: Boot 4 app, OpenAI starter, one endpoint, one retry wrapper.

## How do you bootstrap Spring Boot 4 with Spring AI 2.0?

On [start.spring.io](https://start.spring.io), pick Web and the OpenAI model starter. Same result from the terminal:

```bash
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=4.0.7 \
  -d javaVersion=21 \
  -d groupId=com.example \
  -d artifactId=boot4-spring-ai \
  -d name=boot4-spring-ai \
  -d packageName=com.example.boot4springai \
  -d dependencies=web,spring-ai-openai \
  -o boot4-spring-ai.zip

unzip boot4-spring-ai.zip -d boot4-spring-ai && cd boot4-spring-ai
```

Set your API key in `application.properties` — I export the secret from the shell so nothing lands in git:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

```properties
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4o-mini
spring.threads.virtual.enabled=true
```

For the retry demo in the next section, add `spring-boot-starter-resilience` to `pom.xml`. Initializr does not list it yet on my Boot 4.0.7 generate, so drop it in by hand:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-resilience</artifactId>
</dependency>
```

Or import everything explicitly if you are not using Initializr:

```xml
<properties>
    <java.version>21</java.version>
    <spring-ai.version>2.0.0</spring-ai.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>${spring-ai.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-starter-model-openai</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-resilience</artifactId>
    </dependency>
</dependencies>
```

[Screenshot: IDE showing Boot 4 project with spring-ai-openai and starter-resilience on the classpath]

## How do you call a model and retry when the provider hiccups?

Auto-configuration gives you `ChatClient.Builder`. I kept the controller thin and put retry logic in a service — that is where I want resilience to live.

Boot 4 uses native `org.springframework.resilience` annotations, not the old `spring-retry` library. Without `@EnableResilientMethods` on a config class, `@Retryable` is silently ignored at runtime:

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.EnableResilientMethods;

@Configuration
@EnableResilientMethods
class ResilienceConfig {
}
```

Service and controller:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Service
class ModelGateway {

    private final ChatClient chatClient;

    ModelGateway(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Retryable(maxRetries = 3, delay = 500, multiplier = 2.0, jitter = 125)
    String askWithRetry(String question) {
        return chatClient.prompt()
                .system("Answer in one or two sentences for a Java developer.")
                .user(question)
                .call()
                .content();
    }
}

@RestController
class StackCheckController {

    private final ModelGateway modelGateway;

    StackCheckController(ModelGateway modelGateway) {
        this.modelGateway = modelGateway;
    }

    @GetMapping("/stack-check")
    String stackCheck(@RequestParam(defaultValue = "What is Spring Boot 4 in one sentence?") String q) {
        return modelGateway.askWithRetry(q);
    }
}
```

Run it:

```bash
mvn spring-boot:run
curl -s "http://localhost:8080/stack-check?q=Why%20pair%20Boot%204%20with%20Spring%20AI%3F"
```

[Screenshot: terminal showing curl response from /stack-check]

You should get plain text back. The interesting part is not the answer — it is that retry, virtual threads, and `ChatClient` all wired up without custom HTTP glue. That is the stack bet in one endpoint.

If you get a 401, check that `OPENAI_API_KEY` is exported in the same shell where Maven runs. I lost twenty minutes to that before I noticed :)

## Should you pick Spring AI over LangChain4j?

Honest answer from a Spring shop: if your services already run on Boot, Spring AI is the path of least resistance. Security, config, Actuator metrics, and bean lifecycle stay in familiar territory.

LangChain4j is the better default when you are not on Spring — Quarkus, Micronaut, plain Java — or when you need the widest provider matrix today. I would not treat them as rivals. LangChain4j runs fine as a Spring bean when Spring AI has not caught up on a capability you need.

Direct SDK calls still make sense for a one-off script. They get painful once you need memory, tools, structured output, and provider swaps in the same codebase.

## What would I do on a real migration?

I would not jump 3.x straight to 4.0 in production on a Friday. The path that keeps me calm:

1. Land on **Spring Boot 3.5** and clear deprecation warnings.
2. Spike **Boot 4 + Spring AI 2.0** on a greenfield service — like this repo.
3. Add **MCP and advisors** only after the basic chat path is green in CI.
4. Keep LangChain4j in the toolbox for provider gaps, not as the default stack.

Boot 4 API versioning and declarative HTTP clients are compelling for API-heavy shops. I am saving those for a follow-up once this AI spike is merged.

## Recap

Spring Boot 4 and Spring AI 2.0 are the pairing Spring documents for new AI work in Java. I bootstrapped a Boot 4.0.7 project with the OpenAI starter, enabled virtual threads, wrapped `ChatClient` in `@Retryable`, and confirmed the stack runs from a single `curl`.

I would start new AI-facing services on this stack today. I would migrate brownfield apps carefully — Boot 4 has real Jackson and Jakarta moves that deserve their own migration window.

Thanks again for reading :), if you have any questions please leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Spring AI Getting Started: https://docs.spring.io/spring-ai/reference/getting-started.html
- Spring Boot 4.0 release notes: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes
- Article that kicked off my reading: https://medium.com/@chrisvanbreeden/spring-boot-4-and-spring-ai-2-0-the-new-java-ai-stack-58e9577e7919
- Website: https://tommarler.com

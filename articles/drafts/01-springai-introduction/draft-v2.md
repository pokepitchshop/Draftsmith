Happy Monday everyone — I have been asked twice this quarter whether we should bolt an LLM onto our Spring Boot services. Both times the real question was not "can we call OpenAI?" but "do we have a sane Java layer for it?"

Raw SDK demos work in a spike. They fall apart once you need portable config, structured responses, and something your team can maintain. Spring AI is the path I am evaluating, and this is Part 1 of me learning it in public.

When you finish reading Part 1 of this series you will understand what Spring AI is for, why it beats one-off SDK glue in a Spring shop, and you will have a working `/ask` endpoint that returns model text from your laptop.

## What is Spring AI?

Spring AI is Spring's toolkit for generative AI in Java. It wraps chat models, embeddings, vector stores, RAG, tool calling, memory, and observability behind interfaces that feel like the rest of Spring Boot — starters, properties, and injectable beans.

I do not think of it as "ChatGPT from Java." I think of it as the layer that lets a normal enterprise app ask a model a question, ground answers in company docs later, and call approved APIs without rewriting everything when the provider changes.

## Why would a Spring team reach for it?

You can call OpenAI or Anthropic directly from Java. I tried that first on a spike and it was fine for one endpoint.

It gets messy when the app needs more than a string back:

- System instructions you do not want copy-pasted in every controller
- Answers grounded in internal PDFs or wikis
- Structured Java objects instead of prose
- Swapping Ollama locally for OpenAI in prod
- Token usage and latency you can actually observe

Spring AI gives you portable abstractions (`ChatClient`, `VectorStore`, advisors) so the business code stays closer to the problem. I am not using RAG or tools in Part 1 — but that is where this series is headed.

## How do you add Spring AI to a Maven project?

Spring AI **2.0.0** is on Maven Central. Pair it with Spring Boot **4.0.x** — see the [Getting Started guide](https://docs.spring.io/spring-ai/reference/getting-started.html) for the current matrix.

On [start.spring.io](https://start.spring.io), create a project with Web and an OpenAI model starter, or add this to `pom.xml`:

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
</dependencies>
```

Set your API key — I keep mine out of git:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

```properties
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4o-mini
```

[Screenshot: start.spring.io with Web and OpenAI model starter selected]

## How do you make your first ChatClient call?

Auto-configuration gives you a `ChatClient.Builder`. Inject it, build a client, and expose a simple endpoint:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IntroController {

    private final ChatClient chatClient;

    public IntroController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/ask")
    String ask(@RequestParam(defaultValue = "What is Spring AI in one sentence?") String question) {
        return chatClient.prompt()
                .system("You explain Java and Spring topics clearly for developers.")
                .user(question)
                .call()
                .content();
    }
}
```

Run and verify:

```bash
mvn spring-boot:run
curl -s "http://localhost:8080/ask?question=What%20problem%20does%20Spring%20AI%20solve%3F"
```

You should get a plain-text answer in the terminal. That is the whole Part 1 payoff — model access through Spring beans, not a hand-rolled HTTP client.

[Screenshot: terminal showing curl response from /ask]

If you get a 401, check that `OPENAI_API_KEY` is exported in the same shell where Maven runs. I lost twenty minutes to that before I noticed the variable was missing :)

## What am I saving for later parts?

The intro guides I read cover a lot of ground — embeddings, vector stores, RAG ingestion, tool calling, MCP, observability, evaluation. All useful, all too much for one sitting.

My learning order for this series:

1. **Part 1 (this article)** — what Spring AI is + first `ChatClient` call
2. **Part 2** — fluent API, personas, and prompt templates
3. **Part 3** — structured output mapped to Java records
4. **Part 4+** — embeddings, vector store, and RAG over real docs

I would rather have one green endpoint today than a diagram of enterprise AI architecture with nothing runnable.

## Recap

Spring AI brings generative AI into Spring Boot with familiar starters and portable interfaces. Part 1 is intentionally small: add the BOM, wire `ChatClient`, hit `/ask` with `curl`, and confirm the model responds.

In Part 2 I will go deeper on the fluent `ChatClient` API — `defaultSystem`, template params, and temperature — on the same repo. See you in the next article.

Thanks again for reading :), if you have any questions please leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Spring AI Getting Started: https://docs.spring.io/spring-ai/reference/getting-started.html
- Spring AI ChatClient reference: https://docs.spring.io/spring-ai/reference/api/chatclient.html
- Source guide that sent me down this path: https://codewithvenu.com/blog/AI/Spring-AI-Guide/01-SpringAI-Introduction

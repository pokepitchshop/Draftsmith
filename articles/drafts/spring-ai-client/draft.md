I got Spring AI returning strings from a `/hello` endpoint last week — proof the API key worked, but not much else. My next task was wiring `ChatClient` into a real service: set a persona once, pass dynamic inputs without string concatenation, and control when the model gets creative versus factual. I wanted to see which patterns actually stuck before I reached for structured output or advisors.

When you finish reading this article you will have a small Spring Boot app with three `ChatClient` patterns working: a basic fluent chain, a `defaultSystem` bean, and a parameterized user prompt you can hit with `curl`.

## What is the ChatClient fluent chain?

`ChatClient` sits above the low-level `ChatModel` and gives you a chain that feels familiar if you have used `WebClient` or `RestClient`. The smallest useful version is four calls:

```java
return chatClient.prompt()
        .user("Explain Java records in one sentence")
        .call()
        .content();
```

`prompt()` starts the chain, `user()` sets the message, `call()` blocks until the model responds, and `content()` pulls the text out. That is the baseline I kept on a `/ask` endpoint while I layered the other patterns around it.

[Screenshot: IDE showing AskController with the four-step ChatClient chain]

## How do you add Spring AI to a Maven project?

I used Spring AI **2.0.0** on Maven Central with Spring Boot **4.0.x**. On [start.spring.io](https://start.spring.io), pick Web plus an OpenAI starter, or add this to `pom.xml`:

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

Set the API key in `application.properties`:

```properties
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4o-mini
spring.ai.openai.chat.options.temperature=0.5
```

```bash
export OPENAI_API_KEY=sk-your-key-here
mvn spring-boot:run
```

[Screenshot: terminal showing Spring Boot startup with spring-ai auto-configuration]

## How do you define a persona without repeating yourself?

System messages set behavior; user messages carry the actual question. Repeating "You are a helpful assistant…" in every controller method gets old fast.

What stuck for me was a dedicated `@Bean` with `defaultSystem(...)`:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class MentorChatClientConfig {

    @Bean
    ChatClient mentorChatClient(ChatClient.Builder builder) {
        return builder
                .defaultSystem("""
                        You are a patient Java mentor.
                        Keep answers practical, under 80 words, and aimed at junior developers.
                        """)
                .build();
    }
}
```

Inject `mentorChatClient` (not `ChatClient.Builder`) in controllers that should inherit that voice. I kept a separate builder-backed client on `/ask` where I wanted a neutral baseline.

[Screenshot: MentorChatClientConfig.java with defaultSystem highlighted]

## Can you pass variables without concatenating strings?

Yes — and you should. The fluent API accepts a template with `{placeholders}` and runtime params, which beats `"I am learning " + topic` for both readability and safety:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TopicController {

    private final ChatClient mentorChatClient;

    public TopicController(ChatClient mentorChatClient) {
        this.mentorChatClient = mentorChatClient;
    }

    @GetMapping("/topic-tip")
    String topicTip(@RequestParam(defaultValue = "Spring Boot") String topic) {
        return mentorChatClient.prompt()
                .user(u -> u.text("Give one study tip for learning {topic} this week.")
                        .param("topic", topic))
                .call()
                .content();
    }
}
```

```bash
curl -s "http://localhost:8080/topic-tip?topic=generics"
```

You should get a short, topic-specific tip in the mentor voice from `defaultSystem`.

[Screenshot: curl output from /topic-tip with topic=generics]

## How do you control creativity per request?

Global temperature in `application.properties` is fine as a default. When I needed a factual answer on one endpoint and a looser brainstorm on another, per-request `ChatOptions` worked:

```java
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BrainstormController {

    private final ChatClient chatClient;

    public BrainstormController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/brainstorm")
    String brainstorm() {
        return chatClient.prompt()
                .user("Name three unusual names for a developer newsletter.")
                .options(ChatOptions.builder().temperature(0.9).build())
                .call()
                .content();
    }
}
```

Low temperature (around 0.3) for facts, higher (0.8–0.9) when you want variety. I did not need provider-specific options on day one — `ChatOptions` covered my cases.

[Screenshot: side-by-side curl responses showing factual vs creative temperature settings]

## What about streaming?

The blog post I read made a good case for `.stream().content()` returning a `Flux<String>` with `produces = MediaType.TEXT_EVENT_STREAM_VALUE` on the controller. I tried it locally and it worked, but my demo API only returns short JSON snippets right now. I shelved streaming until I build a UI that benefits from token-by-token output.

One synchronous `ChatClient` setup beat wiring SSE before I had a front end to consume it.

## Recap

On a real Spring Boot repo, `ChatClient` setup that stuck for me was: BOM plus one starter, a four-step fluent chain for the basics, `defaultSystem` on a `@Bean` for persona, template params for dynamic prompts, and per-request `ChatOptions` when temperature matters. Structured output and streaming can wait for the next iteration.

Let me know what you think — leave a comment below. Looking forward to hearing from you :)

Please checkout the below links:

- Spring AI ChatClient reference: https://docs.spring.io/spring-ai/reference/api/chatclient.html
- Source article that sent me down this path: https://mohankumarsagadevan.medium.com/spring-ai-101-hello-world-with-chatclient-mastering-the-fluent-api-and-prompts-97beda2cbdd7
- Spring AI Getting Started: https://docs.spring.io/spring-ai/reference/getting-started.html

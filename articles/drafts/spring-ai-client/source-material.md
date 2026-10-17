---
source_url: https://mohankumarsagadevan.medium.com/spring-ai-101-hello-world-with-chatclient-mastering-the-fluent-api-and-prompts-97beda2cbdd7
link_type: blog
title: "https://mohankumarsagadevan.medium.com/spring-ai-101-hello-world-with-chatclient-mastering-the-fluent-api-and-prompts-97beda2cbdd7"
ingested_at: 2026-07-08T23:46:34.120Z
engine: jina
---

Published Time: 2026-01-04T11:28:48Z

[![Image 1: Mohan Kumar Sagadevan](https://miro.medium.com/v2/resize:fill:32:32/1*zKaXMRuEbUv7uPeumXUgzg.png)](https://mohankumarsagadevan.medium.com/?source=post_page---byline--97beda2cbdd7---------------------------------------)

4 min read

Jan 4, 2026

In our [previous](https://medium.com/@mohankumarsagadevan/spring-ai-101-bridging-the-gap-between-java-and-generative-ai-f920af1473a1) blog post, we set up our Spring Boot project and established a connection to an AI model using just a few lines of configuration. We demonstrated the “Hello World” of AI: sending a string and getting a string back.

However, treating a Large Language Model (LLM) like a simple string processing function misses the point of Generative AI. To build truly intelligent applications, we need to provide context, define personas, parameterize inputs, and control the model’s creativity.

In this post, we will master the `ChatClient`**API**—Spring AI’s fluent, portable client that feels right at home to anyone who has used Spring's `WebClient` or `RestClient`.

## The Fluent API: Anatomy of a Request

The `ChatClient` is the primary interface for interacting with AI models. While the underlying `ChatModel` handles the low-level communication with providers (like OpenAI or Anthropic), the `ChatClient` provides a higher-level, fluent API for building prompts.

A standard interaction follows this pattern:

String response = chatClient.prompt()

 .user("Tell me a joke about Java")

 .call()

 .content();
1.   `prompt()`: Initiates the fluent chain.
2.   `user()`: Sets the user's input message.
3.   `call()`: Executes the request synchronously (blocking until the response arrives).
4.   `content()`: Extracts the string content from the response.

## System vs. User: Defining the Persona

One of the most powerful concepts in prompt engineering is the distinction between **System** and **User** messages.

*   **System Messages:** These guide the AI’s behavior, style, and limitations. They set the “persona”.
*   **User Messages:** These are the specific inputs or questions from the end-user.

If you were building a customer support bot for a travel agency, you wouldn’t want to repeat “You are a helpful travel assistant…” in every single request. Spring AI solves this with **Default System Texts**.

You can configure a specific `ChatClient` bean with defaults that apply to every interaction:

@Configuration

class AiConfig {

 @Bean

 ChatClient travelChatClient(ChatClient.Builder builder) {

 return builder

 .defaultSystem("You are a friendly travel agent. answer in a concise, professional tone.")

 .build();

 }

}
Now, when you inject this specific `travelChatClient` and call it, the AI already knows who it is. You only need to provide the user input.

## Dynamic Prompts: Using Templates

Hardcoding strings is a bad practice in software development, and it’s a bad practice in AI engineering. We need prompts that are dynamic.

Spring AI supports **Prompt Templates** natively within the fluent API. Instead of concatenating strings (which is prone to injection attacks and formatting errors), we use placeholders (like `{variable}`) and replace them at runtime.

## Get Mohan Kumar Sagadevan’s stories in your inbox

Join Medium for free to get updates from this writer.

Remember me for faster sign in

Here is how you pass variables to a user message:

@PostMapping

public String getTopDestinations(@RequestBody String city) {

 return this.travelChatClient.prompt()

 .user(u -> u.text("I am visiting {city}. What are the top 3 destination places?")

 .param("city", city))

 .call()

 .content();

}
Under the hood, Spring AI uses a `PromptTemplate` engine to perform this substitution safely before sending the request to the model.

## Controlling Creativity: ChatOptions

Sometimes you want a factual answer (e.g., “What is the capital of France?”), and other times you want a creative story. This is controlled by the **Temperature** setting.

*   **Low Temperature (e.g., 0.3):** Focused, deterministic, and conservative.
*   **High Temperature (e.g., 0.8):** Creative, random, and diverse.

Spring AI allows you to set these options globally (in `application.properties`)

spring.ai.openai.chat.options.temperature=0.7
or per request using `ChatOptions`

String creativeStory = chatClient.prompt()

 .user("Tell me a bedtime story about a brave toaster.")

 .options(ChatOptions.builder()

 .temperature(0.8) 

 .build())

 .call()

 .content();
You can also use provider-specific options, such as `OpenAiChatOptions`, if you need access to specific features like `frequency_penalty` or specific model versions.

## Synchronous vs. Streaming

So far, we have used `.call()` which blocks the thread until the AI generates the full response. For long responses, this can leave the user staring at a loading spinner for seconds.

To improve the user experience, we can use **Streaming**. This delivers the response chunk-by-chunk as it is generated, similar to how ChatGPT types out answers in real-time.

Switching to streaming requires minimal code changes:

public Flux<String> streamStory() {

 return this.chatClient.prompt()

 .user("Tell me a long story...")

 .stream() 

 .content(); 

}
The `.stream()` method returns a Reactive `Flux`, which pushes data to the client as soon as it arrives.

> **Note**: When using ‘stream’, Make sure to set controller producer type to `text/event-stream`. This tells Spring Boot to flush the buffer immediately after every chunk, rather than waiting for the whole string to complete.

## Conclusion

We have moved beyond simple text generation. By using `ChatClient.Builder` to define personas, `PromptTemplate` to handle dynamic inputs, and `ChatOptions` to control behavior, we are now building robust AI interactions.

However, there is still one major problem: **The output is just text.**

If you are building an application, you probably need objects, not strings. You need JSON to populate your UI or entities to save to your database. In the next post, **“**[**Beyond Plain Text**](https://mohankumarsagadevan.medium.com/spring-ai-101-beyond-plain-text-structured-output-mapping-to-java-records-ef26e9f08150)**,”** we will look at Spring AI’s **Structured Output** API, which magically converts AI babble into strongly typed Java Records.

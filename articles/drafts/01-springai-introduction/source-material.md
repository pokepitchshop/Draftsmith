---
source_url: https://codewithvenu.com/blog/AI/Spring-AI-Guide/01-SpringAI-Introduction
link_type: blog
title: "https://codewithvenu.com/blog/AI/Spring-AI-Guide/01-SpringAI-Introduction"
ingested_at: 2026-07-10T11:48:25.927Z
engine: jina
---

A clear guide to Spring AI, its supported features, core architecture, RAG flow, tool calling, MCP, memory, observability, and enterprise use cases.

Spring AI is the Spring ecosystem's framework for building Generative AI applications in Java. It gives Spring Boot developers a familiar way to connect enterprise applications, private data, APIs, vector databases, and AI models without hard-coding every provider-specific SDK detail.

The simplest way to understand Spring AI is this:

> Spring AI brings AI model access, prompts, embeddings, vector stores, RAG, tools, memory, MCP, observability, and evaluation into normal Spring Boot application design.

Instead of thinking only about "calling ChatGPT from Java", think about building production AI workflows:

*   A support bot that answers from internal documents.
*   A banking assistant that calls approved account APIs.
*   A code assistant that reads project knowledge and returns structured output.
*   A document intelligence service that extracts facts from PDFs.
*   An enterprise agent that uses tools, memory, audit logs, and model evaluation.

Spring AI helps organize those workflows using Spring-style abstractions.

## Why Spring AI Exists

Most enterprise AI applications need more than one model call.

A real application often needs to:

*   Accept a user question.
*   Add system instructions and business rules.
*   Retrieve relevant company data.
*   Convert documents into embeddings.
*   Search a vector database.
*   Call tools or backend APIs.
*   Keep conversation memory.
*   Return structured Java objects.
*   Stream responses back to the UI.
*   Observe latency, token usage, and failures.
*   Evaluate whether the answer is grounded and useful.

Without a framework, this becomes custom glue code around model SDKs, vector database clients, prompt templates, API calls, logging, and retry logic.

Spring AI provides common interfaces and Spring Boot auto-configuration so your code can stay closer to the business problem.

## High-Level Architecture

Spring AI sits between your Spring Boot application and the AI ecosystem.

The key idea is portability. Your application talks to Spring AI abstractions. Spring AI talks to OpenAI, Azure OpenAI, Anthropic, Amazon Bedrock, Google, Ollama, Mistral, and other providers through provider-specific implementations.

## Current Spring AI Feature Support

Spring AI 2.0 documentation lists support across model access, vector stores, RAG, tool calling, memory, MCP, observability, evaluation, and Spring Boot starters.

| Feature Area | What Spring AI Provides | Why It Matters |
| --- | --- | --- |
| Chat models | Portable chat APIs with synchronous and streaming support | Build chatbots, assistants, copilots, and agent workflows |
| Embedding models | Convert text or content chunks into vectors | Required for semantic search and RAG |
| Image models | Text-to-image integrations where providers support them | Generate images from prompts |
| Audio models | Transcription and text-to-speech support | Build voice, meeting, and audio assistant workflows |
| Moderation models | Provider-backed moderation support | Detect unsafe or policy-sensitive content |
| ChatClient API | Fluent Spring-style API similar in spirit to WebClient and RestClient | Cleaner model calls and reusable configuration |
| Prompts and messages | System, user, assistant, and template-based prompt composition | Keep instructions consistent and maintainable |
| Structured output | Map model responses to Java POJOs | Useful for extraction, classification, routing, and automation |
| Multimodality | Work with multiple input/output modalities where models support them | Build richer AI applications beyond plain text |
| Advisors | Reusable interceptors around model calls | Add memory, RAG, logging, guardrails, or custom behavior |
| Chat memory | Conversation history support | Build contextual chat experiences |
| Tool/function calling | Let models request execution of Java methods or backend tools | Connect LLM reasoning to real business actions |
| MCP | Client and server support for Model Context Protocol | Connect Spring apps to external tool ecosystems |
| RAG | Retrieval Augmented Generation patterns | Ground model answers in your own data |
| ETL pipeline | Document loading, splitting, transforming, and writing to vector stores | Prepare enterprise documents for AI search |
| Vector stores | Portable vector database abstraction with metadata filters | Swap vector databases with less application rewrite |
| Observability | AI-related metrics, tracing, and operational insight | Debug cost, latency, errors, and model behavior |
| Model evaluation | Utilities for evaluating generated content | Reduce hallucination risk and measure response quality |
| Boot starters | Auto-configuration for models and vector stores | Faster setup in Spring Boot projects |
| Testcontainers support | Development and test support for infrastructure dependencies | Test vector stores and AI integrations more reliably |

## Supported Model Types

Spring AI is not only a chat wrapper. It supports several model categories.

Common provider families include OpenAI, Azure OpenAI, Anthropic, Amazon Bedrock, Google GenAI/Vertex AI, Ollama, Mistral AI, Groq, NVIDIA, DeepSeek, OCI Generative AI, Perplexity AI, Stability AI, ElevenLabs, and others depending on model type.

The exact model capabilities still depend on the provider. For example, one provider may support streaming chat but not image generation, while another may support embeddings but not moderation.

## Core Building Blocks

### 1. ChatClient

`ChatClient` is the main fluent API for calling chat models.

Conceptually, it lets you define:

*   The user message.
*   System instructions.
*   Prompt parameters.
*   Advisors.
*   Tools.
*   Output mapping.
*   Streaming or non-streaming response behavior.

Example shape:

```
String answer = chatClient
    .prompt()
    .system("You are a helpful Java architecture assistant.")
    .user("Explain Spring AI in simple terms.")
    .call()
    .content();
```

For applications, this is usually wrapped inside a service:

```
@Service
public class AiAssistantService {

    private final ChatClient chatClient;

    public AiAssistantService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String ask(String question) {
        return chatClient
            .prompt()
            .system("Answer clearly for Java and Spring Boot developers.")
            .user(question)
            .call()
            .content();
    }
}
```

### 2. Prompts and Messages

Prompts are not just strings. A production prompt usually has different message roles.

| Message Type | Purpose | Example |
| --- | --- | --- |
| System | Defines behavior, tone, rules, and constraints | "Answer only from provided context." |
| User | The user request | "How do I configure PGVector?" |
| Assistant | Prior model response | Used in conversation history |
| Tool | Result returned from a tool call | "Account balance is 1500 USD." |

Good Spring AI applications keep prompts explicit, versioned, and testable. Avoid scattering long prompt strings across controllers.

### 3. Structured Output

Structured output maps model responses into Java types.

This is useful when the model should return data, not prose.

Examples:

*   Extract invoice fields into an `InvoiceSummary`.
*   Classify a support ticket into a `TicketCategory`.
*   Convert a natural language request into a `SearchFilter`.
*   Return a generated SQL explanation with separate `query`, `risk`, and `notes` fields.

Example target object:

```
public record SupportTicketAnalysis(
    String category,
    String priority,
    String summary,
    List<String> recommendedActions
) {}
```

Structured output is especially important in enterprise workflows because downstream code needs predictable data.

### 4. Embeddings

Embeddings convert text into numeric vectors that preserve semantic meaning.

Two sentences can use different words but still be close in vector space:

*   "How do I reset my password?"
*   "I forgot my login credentials."

Spring AI provides embedding model abstractions so your application can create embeddings without being tightly coupled to one provider.

### 5. Vector Store

A vector store saves embeddings and lets you search by semantic similarity.

Spring AI supports many vector database providers through a portable `VectorStore` abstraction, including PostgreSQL/PGVector, Redis, Pinecone, Qdrant, Weaviate, Chroma, Milvus, MongoDB Atlas, Neo4j, Elasticsearch, OpenSearch, Oracle, Cassandra, MariaDB, Typesense, Azure services, and more.

The vector store is the backbone of RAG.

## Chat Request Data Flow

This is the basic flow for a normal chat request without RAG or tools.

This works for general knowledge questions, summarization, rewriting, classification, and simple assistant behavior.

However, for enterprise data, this is not enough. The model does not automatically know your private documents, APIs, database records, or policies. That is where RAG and tool calling come in.

## RAG: Retrieval Augmented Generation

RAG means:

1.   Retrieve relevant data from your knowledge base.
2.   Add that data to the prompt.
3.   Ask the model to answer using the retrieved context.

RAG reduces hallucinations because the model receives trusted context at request time.

### RAG Ingestion Flow

Before users can ask questions over documents, you need to ingest the documents.

### RAG Query Flow

At question time, the flow is different.

### RAG Prompt Pattern

A common RAG system instruction looks like this:

```
You are a support assistant.
Answer using only the provided context.
If the context does not contain the answer, say you do not know.
Do not invent policy details.
```

Then the application adds retrieved context:

```
Context:
{retrieved_document_chunks}

User question:
{question}
```

This pattern is simple but powerful.

## Tool Calling and Function Calling

RAG answers from knowledge. Tool calling takes action or fetches live data.

Use tool calling when the model needs to:

*   Check order status.
*   Create a support ticket.
*   Query inventory.
*   Send an email.
*   Calculate pricing.
*   Call an internal REST API.
*   Search a database through an approved service.

The important design rule: the model does not directly execute your business logic. Your application exposes approved tools, validates inputs, executes them, and returns results to the model.

## Advisors

Advisors wrap behavior around model calls.

Think of advisors as reusable AI middleware.

They can help with:

*   Adding chat memory.
*   Adding retrieved RAG context.
*   Logging requests and responses.
*   Applying policies.
*   Transforming prompts.
*   Reusing common model-call patterns.

This keeps controllers and services cleaner because cross-cutting AI behavior does not have to be repeated everywhere.

## Chat Memory

Chat memory stores prior conversation messages so the assistant can understand follow-up questions.

Example:

```
User: What is Spring AI?
Assistant: Spring AI is a framework for building AI applications in Spring Boot.
User: Does it support RAG?
```

The second question only makes sense because memory knows "it" means Spring AI.

Memory is useful, but it must be managed carefully:

*   Do not send unlimited chat history to the model.
*   Summarize or window older messages.
*   Avoid storing sensitive data unless the application is designed for it.
*   Keep tenant and user boundaries strict.
*   Combine memory with retrieval when the answer needs factual grounding.

## MCP: Model Context Protocol

MCP standardizes how AI applications connect to tools, resources, and external context providers.

Spring AI supports MCP client and server scenarios.

This matters because enterprise AI systems are becoming more tool-oriented. MCP gives a common integration layer instead of building one-off tool adapters for every client.

## Observability

AI observability is different from normal HTTP observability because model calls include:

*   Prompt size.
*   Completion size.
*   Token usage.
*   Model latency.
*   Provider errors.
*   Tool call behavior.
*   Retrieval quality.
*   Cost signals.
*   Safety and policy events.

Spring AI provides observability support so teams can understand what is happening in production.

Good observability answers questions like:

*   Which model is slow?
*   Which prompt version is expensive?
*   Which retrieval queries return poor context?
*   Which tool calls fail most often?
*   Are users receiving ungrounded answers?

## Model Evaluation

Model evaluation helps you test AI output quality.

Examples:

*   Is the answer relevant to the question?
*   Is the answer grounded in the retrieved context?
*   Did the model follow the requested format?
*   Did the model refuse when context was missing?
*   Did the model produce unsafe or unsupported claims?

Evaluation is important because AI applications are probabilistic. You need tests and measurements, not only manual demos.

## Enterprise Spring AI Reference Architecture

For a production-grade application, the architecture usually looks like this:

## When To Use Each Feature

| Requirement | Spring AI Feature To Use |
| --- | --- |
| Simple assistant | ChatClient |
| Stream response to UI | Streaming chat model API |
| Answer from private documents | RAG + VectorStore + Embeddings |
| Search semantically | EmbeddingModel + VectorStore |
| Return Java objects | Structured output |
| Use conversation history | Chat memory |
| Call backend APIs | Tool/function calling |
| Connect to external tool ecosystem | MCP client/server |
| Generate images | Image model |
| Transcribe audio | Audio transcription model |
| Read answers aloud | Text-to-speech model |
| Check unsafe content | Moderation model |
| Track latency and cost | Observability |
| Measure answer quality | Model evaluation |
| Run local models | Ollama or local provider integration |
| Swap AI providers | Spring AI portable abstractions |

## Spring AI vs Direct Provider SDKs

You can call a provider SDK directly, and that is fine for small experiments.

Spring AI becomes more valuable when your application needs structure.

| Direct Provider SDK | Spring AI |
| --- | --- |
| Fast for one provider demo | Better for Spring Boot applications |
| Provider-specific request/response types | Portable abstractions |
| You build your own RAG pipeline | Built-in RAG and ETL concepts |
| You build your own vector-store integration | VectorStore abstraction |
| Tool calling is provider-specific | Spring-friendly tool calling |
| Observability is custom | AI observability support |
| Harder to swap providers | Easier provider replacement |
| Less Spring Boot auto-configuration | Boot starters and properties |

## Common Use Cases

### 1. Documentation Chatbot

Use RAG to answer from markdown, PDFs, Confluence exports, or product docs.

Flow:

### 2. Customer Support Assistant

Use RAG for policy knowledge and tools for live ticket/order/account data.

Use structured output to convert unstructured text into Java records.

Examples:

*   Resume parsing.
*   Invoice extraction.
*   Contract clause extraction.
*   Email intent classification.
*   Incident report summarization.

### 4. Agentic Workflow

Use ChatClient, tools, memory, and MCP when the assistant needs to reason across multiple steps.

Example:

1.   Understand the user's goal.
2.   Retrieve relevant policy.
3.   Call an internal API.
4.   Validate the result.
5.   Return a final answer.

## Best Practices

1.   Start with a narrow use case.
2.   Keep prompts explicit and versioned.
3.   Use RAG for private or frequently changing knowledge.
4.   Use tools only for approved actions.
5.   Validate tool inputs before execution.
6.   Use structured output when downstream code depends on the response.
7.   Add observability before production.
8.   Evaluate answers with realistic test questions.
9.   Protect sensitive data in prompts, memory, logs, and vector stores.
10.   Keep provider-specific options isolated.

## Common Mistakes

| Mistake | Why It Hurts | Better Approach |
| --- | --- | --- |
| Treating the model as a database | Models can hallucinate or miss exact facts | Use RAG or real database tools |
| Sending entire documents in prompts | Expensive and often lower quality | Chunk, embed, retrieve |
| No source metadata | Hard to explain where answers came from | Store source, page, section, tenant, version |
| Unlimited chat memory | Token cost and privacy risk | Use bounded memory or summaries |
| Tool calls without validation | Security and data integrity risk | Validate, authorize, and audit tool execution |
| No evaluation set | Quality regressions go unnoticed | Build question/answer test cases |
| No observability | Production issues are hard to debug | Track latency, tokens, retrieval, and failures |

## Simple Mental Model

Use this mental model when designing Spring AI applications:

Spring AI gives you the Java and Spring Boot building blocks for this model.

## Summary

Spring AI is a production-oriented framework for building AI features in Spring Boot applications. It provides portable abstractions for chat, embeddings, image, audio, moderation, vector stores, RAG, tools, memory, MCP, structured output, observability, and evaluation.

The main value is not just calling an LLM. The value is connecting enterprise data and APIs to AI models using familiar Spring patterns.

For most Java teams, the best learning path is:

1.   Build a simple `ChatClient` assistant.
2.   Add streaming responses.
3.   Add structured output.
4.   Add embeddings and a vector store.
5.   Build RAG over real documents.
6.   Add tool calling for live business actions.
7.   Add memory, observability, and evaluation.
8.   Explore MCP for broader tool integration.

That path moves from a demo chatbot to a real enterprise AI application.

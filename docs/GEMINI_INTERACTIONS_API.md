# Gemini Interactions API Reference (Deep Research)

## Initialization
Use the `@google/genai` SDK. Deep Research is an 'Agent', not a 'Model'.
Endpoint: `agent: "deep-research-pro-preview-12-2025"`

## Core Request Pattern
To start a long-running research task:
const interaction = await client.interactions.create({
  agent: "deep-research-pro-preview-12-2025",
  input: "Research prompt here...",
  background: true, // Required for tasks > 60 seconds
});

## Status Polling
Deep Research takes 5-20 minutes. Poll the status using the interaction.id:
const status = await client.interactions.get(interaction.id);
// Statuses: 'in_progress', 'completed', 'failed'

## Retrieving Results
When status === 'completed', the report is in:
result.outputs[0].text
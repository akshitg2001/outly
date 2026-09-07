import type { OutingPlan } from '../outly-types';
import { runtimeValue } from './runtime';

export async function polishPlanSummaries(plans: OutingPlan[]) {
  const apiKey = runtimeValue('OPENAI_API_KEY');
  const model = runtimeValue('OPENAI_MODEL');
  if (!apiKey || !model || plans.length === 0) return plans;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 350,
        instructions: 'You write concise, matter-of-fact explanations for a Delhi group outing planner. Use only the supplied facts. Never add availability, price, venue, travel, dietary, or booking claims. Avoid AI language and hype.',
        input: JSON.stringify(plans.map((plan) => ({ id: plan.id, label: plan.label, title: plan.title, area: plan.area, knownCost: plan.knownCost, unknownActivityCost: plan.hasUnknownActivityCost, reasons: plan.reasons }))),
        text: {
          format: {
            type: 'json_schema',
            name: 'outly_plan_summaries',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['summaries'],
              properties: {
                summaries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'summary'],
                    properties: { id: { type: 'string' }, summary: { type: 'string', maxLength: 220 } },
                  },
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok) return plans;
    const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output?.flatMap((item) => item.content ?? []).find((content) => content.type === 'output_text')?.text;
    if (!text) return plans;
    const parsed = JSON.parse(text) as { summaries?: Array<{ id: string; summary: string }> };
    return plans.map((plan) => ({ ...plan, summary: parsed.summaries?.find((item) => item.id === plan.id)?.summary ?? plan.summary }));
  } catch {
    return plans;
  }
}

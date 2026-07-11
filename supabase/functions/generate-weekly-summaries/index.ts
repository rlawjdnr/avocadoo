const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WeeklyEntry = {
  id?: string;
  date?: string;
  weekday?: string;
  nickname?: string;
  location?: string;
  text?: string;
  photoCount?: number;
  commentCount?: number;
  likeCount?: number;
};

type WeeklySummaryRequest = {
  spaceId?: string;
  monthKey?: string;
  weeks?: {
    id?: string;
    range?: string;
    entries?: WeeklyEntry[];
  }[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function trimText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeWeeks(weeks: WeeklySummaryRequest['weeks']) {
  if (!Array.isArray(weeks)) return [];

  return weeks
    .slice(0, 6)
    .map((week) => ({
      id: trimText(week?.id, 80),
      range: trimText(week?.range, 40),
      entries: Array.isArray(week?.entries)
        ? week.entries.slice(0, 10).map((entry) => ({
          date: trimText(entry.date, 12),
          weekday: trimText(entry.weekday, 8),
          nickname: trimText(entry.nickname, 20),
          location: trimText(entry.location, 40),
          text: trimText(entry.text, 220),
          photoCount: Number(entry.photoCount || 0),
          commentCount: Number(entry.commentCount || 0),
          likeCount: Number(entry.likeCount || 0),
        }))
        : [],
    }))
    .filter((week) => week.id && week.entries.length > 0);
}

function extractJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5.4-mini';

  if (!openAiApiKey) {
    return jsonResponse({ error: 'Missing OPENAI_API_KEY' }, 500);
  }

  let body: WeeklySummaryRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const monthKey = trimText(body.monthKey, 7);
  const weeks = normalizeWeeks(body.weeks);

  if (!/^\d{4}-\d{2}$/.test(monthKey) || weeks.length === 0) {
    return jsonResponse({ error: 'monthKey and weeks are required' }, 400);
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                '너는 커플 다이어리 앱 "아보카도"의 홈 주차 요약을 쓰는 한국어 카피라이터야.',
                '각 주의 일기를 보고 귀엽지만 오글거리지 않고, 살짝 웃긴 하이라이트 한 줄을 만들어.',
                '규칙:',
                '- 반드시 JSON 객체만 반환해. 형식은 {"summaries":{"week-id":"요약"}}.',
                '- 각 요약은 한국어 20자 이내.',
                '- 이모지는 쓰지 마.',
                '- 사랑, 설렘, 운명 같은 과한 단어는 피하고 담백하게 써.',
                '- 장소와 횟수를 나열하지 말고 그 주의 웃긴 장면이나 별난 포인트를 잡아.',
                '- 말투는 짧은 제목처럼. 문장 끝에 "~했다", "~한 주"를 반복하지 마.',
                '- 예시 톤: "파스타보다 웃긴 날", "비 맞고도 해맑음", "계획은 졌고 우린 이김"',
                '- 개인 이름은 꼭 필요할 때만 사용해.',
                '- 빈 주는 입력되지 않는다.',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({ monthKey, weeks }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_summaries',
          strict: false,
          schema: {
            type: 'object',
            properties: {
              summaries: {
                type: 'object',
                additionalProperties: {
                  type: 'string',
                },
              },
            },
            required: ['summaries'],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return jsonResponse({ error: 'OpenAI request failed', detail: message.slice(0, 500) }, 502);
  }

  const data = await response.json();
  const outputText = data.output_text || data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content || []).map((content: { text?: string }) => content.text || '').join('\n') || '';
  const parsed = extractJsonObject(outputText);
  const rawSummaries = parsed?.summaries && typeof parsed.summaries === 'object' ? parsed.summaries : {};
  const summaries: Record<string, string> = {};

  for (const week of weeks) {
    const label = trimText(rawSummaries[week.id], 24);
    if (label) summaries[week.id] = label;
  }

  return jsonResponse({ summaries });
});

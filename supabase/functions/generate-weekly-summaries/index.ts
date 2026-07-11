import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

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
    endDate?: string;
    signature?: string;
    entries?: WeeklyEntry[];
  }[];
};

type WeeklySummaryRow = {
  week_id: string;
  summary_text: string;
  entry_signature?: string | null;
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
      endDate: trimText(week?.endDate, 10),
      signature: trimText(week?.signature, 4000),
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

function getSeoulDateInputValue() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isCompletedWeek(endDate: string, todayDate = getSeoulDateInputValue()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(endDate) && endDate < todayDate;
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!openAiApiKey) {
    return jsonResponse({ error: 'Missing OPENAI_API_KEY' }, 500);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase environment variables' }, 500);
  }

  let body: WeeklySummaryRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const monthKey = trimText(body.monthKey, 7);
  const spaceId = trimText(body.spaceId, 80);
  const weeks = normalizeWeeks(body.weeks);

  if (!/^\d{4}-\d{2}$/.test(monthKey) || !spaceId || weeks.length === 0) {
    return jsonResponse({ error: 'spaceId, monthKey, and weeks are required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const weekIds = weeks.map((week) => week.id);
  const { data: storedRows, error: storedError } = await supabase
    .from('weekly_summaries')
    .select('week_id, summary_text, entry_signature')
    .eq('space_id', spaceId)
    .eq('month_key', monthKey)
    .in('week_id', weekIds);

  if (storedError) {
    return jsonResponse({ error: storedError.message }, 500);
  }

  const summaries: Record<string, string> = {};
  const storedByWeek = new Map(
    ((storedRows || []) as WeeklySummaryRow[])
      .filter((row) => row.week_id && row.summary_text)
      .map((row) => [row.week_id, row.summary_text])
  );

  for (const [weekId, summary] of storedByWeek) {
    summaries[weekId] = summary;
  }

  const weeksToGenerate = weeks.filter((week) => !storedByWeek.has(week.id) && isCompletedWeek(week.endDate));

  if (weeksToGenerate.length === 0) {
    return jsonResponse({ summaries, generated: 0 });
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
                '- 각 요약은 한국어 34자 이내.',
                '- 이모지는 쓰지 마.',
                '- 사랑, 설렘, 운명 같은 과한 단어는 피하고 담백하게 써.',
                '- 너무 짧게 압축하지 말고, 그 주의 웃긴 장면이 머릿속에 보이게 써.',
                '- 장소와 횟수를 나열하지 말고 별난 포인트와 상황을 잡아.',
                '- 말투는 짧은 제목처럼. 문장 끝에 "~했다", "~한 주"를 반복하지 마.',
                '- 예시 톤: "파스타보다 디저트 회의가 더 길었던 날", "비 맞고도 해맑게 돌아다닌 우리", "계획은 망했는데 이상하게 재밌음"',
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
              text: JSON.stringify({ monthKey, weeks: weeksToGenerate }),
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
  const generatedRows = [];

  for (const week of weeksToGenerate) {
    const label = trimText(rawSummaries[week.id], 38);
    if (!label) continue;

    summaries[week.id] = label;
    generatedRows.push({
      space_id: spaceId,
      month_key: monthKey,
      week_id: week.id,
      week_range: week.range,
      summary_text: label,
      entry_signature: week.signature || null,
      model,
      generated_at: new Date().toISOString(),
    });
  }

  if (generatedRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('weekly_summaries')
      .upsert(generatedRows, { onConflict: 'space_id,week_id' });

    if (upsertError) {
      return jsonResponse({ error: upsertError.message }, 500);
    }
  }

  return jsonResponse({ summaries, generated: generatedRows.length });
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import * as webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PushEventType = 'diary_created' | 'diary_liked' | 'comment_created' | 'sticker_created' | 'sticker_released';

type PushRequest = {
  eventType?: PushEventType;
  actorMemberId?: string;
  entryId?: string;
  commentId?: string;
  month?: string;
};

type MemberRow = {
  id: string;
  nickname: string;
  space_id: string;
};

type EntryRow = {
  id: string;
  author_id: string;
  space_id: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type WebPushError = {
  statusCode?: number;
  body?: string;
  message?: string;
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

function buildNotification(eventType: PushEventType, nickname: string, entryId: string, siteUrl: string, month = '') {
  const url = new URL(siteUrl);
  if (entryId) url.searchParams.set('entry', entryId);
  if (eventType === 'sticker_created' && /^\d{4}-\d{2}$/.test(month)) {
    url.searchParams.set('month', month);
  }

  if (eventType === 'diary_created') {
    return {
      title: nickname,
      body: '새로운 일기를 작성했어요.',
      url: url.toString(),
    };
  }

  if (eventType === 'diary_liked') {
    return {
      title: nickname,
      body: '좋아요를 남겼어요.',
      url: url.toString(),
    };
  }

  if (eventType === 'sticker_created') {
    return {
      title: nickname,
      body: '새로운 스티커를 붙였습니다.',
      url: url.toString(),
    };
  }

  if (eventType === 'sticker_released') {
    return {
      title: nickname,
      body: '새로운 스티커가 출시됐어요.',
      url: url.toString(),
    };
  }

  return {
    title: nickname,
    body: '댓글을 달았어요.',
    url: url.toString(),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT') || 'mailto:admin@example.com';
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://rlawjdnr.github.io/avocadoo/';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'Missing web push environment variables' }, 500);
  }

  let body: PushRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { eventType, actorMemberId, entryId, month } = body;
  if (!eventType || !actorMemberId) {
    return jsonResponse({ error: 'eventType and actorMemberId are required' }, 400);
  }

  if (!['diary_created', 'diary_liked', 'comment_created', 'sticker_created', 'sticker_released'].includes(eventType)) {
    return jsonResponse({ error: 'Unsupported eventType' }, 400);
  }

  if (eventType !== 'sticker_created' && eventType !== 'sticker_released' && !entryId) {
    return jsonResponse({ error: 'entryId is required for diary notifications' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: actorData, error: actorError } = await supabase
    .from('couple_members')
    .select('id, nickname, space_id')
    .eq('id', actorMemberId)
    .single();

  const { data: entryData, error: entryError } = eventType === 'sticker_created' || eventType === 'sticker_released'
    ? { data: null, error: null }
    : await supabase.from('diary_entries').select('id, author_id, space_id').eq('id', entryId).single();

  const actor = actorData as MemberRow | null;
  const entry = entryData as EntryRow | null;

  if (actorError || !actor || (eventType !== 'sticker_created' && eventType !== 'sticker_released' && (entryError || !entry))) {
    return jsonResponse({ error: 'Actor or diary entry not found' }, 404);
  }

  let targetMemberIds: string[] = [];

  if (eventType === 'sticker_released') {
    const { data: members, error: membersError } = await supabase
      .from('couple_members')
      .select('id')
      .eq('space_id', actor.space_id);

    if (membersError) return jsonResponse({ error: membersError.message }, 500);
    targetMemberIds = (members || []).map((member) => member.id);
  } else if (eventType === 'diary_created' || eventType === 'sticker_created') {
    const { data: members, error: membersError } = await supabase
      .from('couple_members')
      .select('id')
      .eq('space_id', eventType === 'sticker_created' ? actor.space_id : entry!.space_id)
      .neq('id', actorMemberId);

    if (membersError) return jsonResponse({ error: membersError.message }, 500);
    targetMemberIds = (members || []).map((member) => member.id);
  } else if (entry!.author_id !== actorMemberId) {
    targetMemberIds = [entry!.author_id];
  }

  if (targetMemberIds.length === 0) {
    return jsonResponse({ sent: 0, skipped: true });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('member_id', targetMemberIds);

  if (subscriptionsError) {
    return jsonResponse({ error: subscriptionsError.message }, 500);
  }

  const notification = buildNotification(eventType, actor.nickname, entry?.id || '', siteUrl, month);
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const settled = await Promise.allSettled(
    ((subscriptions || []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            ...notification,
            type: eventType,
            entryId: entry?.id || '',
          })
        );

        return { id: subscription.id, sent: true };
      } catch (error) {
        const webPushError = error as WebPushError;
        const statusCode = webPushError.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
        }

        throw {
          id: subscription.id,
          statusCode,
          message: webPushError.message || 'Web push send failed',
          body: webPushError.body,
        };
      }
    })
  );

  const sent = settled.filter((result) => result.status === 'fulfilled').length;
  const failed = settled.length - sent;
  const failures = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason);

  return jsonResponse({ sent, failed, failures });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown web push error' }, 500);
  }
});

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WakeWord {
  id: string;
  phrase: string;
  is_emergency: boolean;
  action_type: 'in_app' | 'email';
}

interface HouseholdMember {
  id: string;
  display_name: string;
  phone_number: string;
}

interface WakeWordMatch {
  matched: boolean;
  phrase: string;
  isEmergency: boolean;
  actionType: 'in_app' | 'email';
  wakeWordId: string;
}

export function useHousehold(userId: string | undefined) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [wakeWords, setWakeWords] = useState<WakeWord[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const membership = memberships?.[0];
    if (!membership) return;
    setHouseholdId(membership.household_id);


    const [wwRes, memRes] = await Promise.all([
      supabase.from('wake_words').select('id, phrase, is_emergency, action_type').eq('household_id', membership.household_id),
      supabase.from('household_members').select('id, display_name, phone_number').eq('household_id', membership.household_id),
    ]);

    setWakeWords((wwRes.data as WakeWord[]) || []);
    setMembers(memRes.data || []);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkForWakeWord = useCallback((transcript: string): WakeWordMatch => {
    const lower = transcript.toLowerCase();
    for (const ww of wakeWords) {
      if (lower.includes(ww.phrase.toLowerCase())) {
        return { 
          matched: true, 
          phrase: ww.phrase, 
          isEmergency: ww.is_emergency,
          actionType: ww.action_type,
          wakeWordId: ww.id
        };
      }
    }
    return { matched: false, phrase: '', isEmergency: false, actionType: 'email', wakeWordId: '' };
  }, [wakeWords]);

  const logAlert = useCallback(async (alertType: string, message: string, snapshotUrl?: string) => {
    if (!householdId || !userId) return;
    await supabase.from('alert_history').insert({
      household_id: householdId,
      alert_type: alertType,
      message,
      triggered_by: userId,
      snapshot_url: snapshotUrl,
    });
  }, [householdId, userId]);

  const logNotification = useCallback(async (
    wakeWordId: string,
    phraseMatched: string,
    actionType: 'in_app' | 'email',
    isEmergency: boolean
  ) => {
    if (!householdId || !userId) return;
    await supabase.from('notification_log').insert({
      household_id: householdId,
      wake_word_id: wakeWordId,
      phrase_matched: phraseMatched,
      action_type: actionType,
      is_emergency: isEmergency,
      recipient_count: members.length,
      triggered_by: userId,
    });
  }, [householdId, userId, members.length]);

  return { 
    householdId, 
    wakeWords, 
    members, 
    checkForWakeWord, 
    logAlert, 
    logNotification,
    refetch: fetchData 
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateImpactSummary,
  getDefaultSelectedActionIds,
} from '@shared/impactEngine';
import type {
  AirQualitySnapshot,
  ChatMessage,
  HouseholdProfile,
  IndiaLiveFeedResponse,
  TailoredPlanResponse,
} from '@shared/types';

export const INITIAL_HOUSEHOLD_PROFILE: HouseholdProfile = {
  city: 'Delhi',
  role: 'family',
  householdSize: 4,
  hasChildren: true,
  hasSeniors: false,
  hasRespiratoryCondition: true,
  commuteMode: 'solo_car',
  commuteKmRoundTrip: 16,
  heatingSource: 'gas_heater',
  cookingFuel: 'gas_stove',
  purifierType: 'none',
  homeSealLevel: 'average',
  outdoorExerciseHabit: true,
  budgetTier: 'low_budget',
};

/**
 * Manages AirKin telemetry, batched All-India feed, Gemini plan orchestration with AbortController
 * cancellation on rapid city changes, and conversational Coach messages.
 */
export function useAirKinData() {
  const [profile, setProfile] = useState<HouseholdProfile>(INITIAL_HOUSEHOLD_PROFILE);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() =>
    getDefaultSelectedActionIds(INITIAL_HOUSEHOLD_PROFILE)
  );
  const [aqi, setAqi] = useState<AirQualitySnapshot | null>(null);
  const [indiaFeed, setIndiaFeed] = useState<IndiaLiveFeedResponse | null>(null);
  const [plan, setPlan] = useState<TailoredPlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [geminiActive, setGeminiActive] = useState(false);

  const planAbortRef = useRef<AbortController | null>(null);

  const loadCityAndPlan = useCallback(
    async (nextProfile: HouseholdProfile, actions: string[]) => {
      planAbortRef.current?.abort();
      const controller = new AbortController();
      planAbortRef.current = controller;

      setIsLoadingPlan(true);
      setErrorMsg(null);
      setPlanError(null);
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: nextProfile,
            selectedActionIds: actions,
          }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          aqi?: AirQualitySnapshot;
          plan?: TailoredPlanResponse;
          error?: string;
        };
        if (controller.signal.aborted) return;

        if (res.status === 400 && !data.aqi) {
          setErrorMsg(data.error || 'Please enter a valid Indian city.');
          return;
        }
        if (data.aqi) {
          setAqi(data.aqi);
        }
        if (res.ok && data.plan) {
          setPlan(data.plan);
        } else {
          setPlan(null);
          setPlanError(data.error || `AI request failed (${res.status}).`);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setErrorMsg('Could not reach the AirKin API server. Make sure the backend is running.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPlan(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const bootController = new AbortController();
    const initialActions = getDefaultSelectedActionIds(INITIAL_HOUSEHOLD_PROFILE);

    fetch('/api/health', { signal: bootController.signal })
      .then((r) => r.json())
      .then((d: { geminiConfiguredOnServer?: boolean }) => {
        setGeminiActive(Boolean(d.geminiConfiguredOnServer));
      })
      .catch(() => {});

    fetch('/api/india-feed', { signal: bootController.signal })
      .then((r) => r.json())
      .then((feed: IndiaLiveFeedResponse) => {
        if (Array.isArray(feed.cities)) setIndiaFeed(feed);
      })
      .catch(() => {});

    fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: INITIAL_HOUSEHOLD_PROFILE,
        selectedActionIds: initialActions,
      }),
      signal: bootController.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          aqi?: AirQualitySnapshot;
          plan?: TailoredPlanResponse;
          error?: string;
        };
        if (bootController.signal.aborted) return;
        if (data.aqi) setAqi(data.aqi);
        if (res.ok && data.plan) {
          setPlan(data.plan);
        } else {
          setPlan(null);
          setPlanError(data.error || `AI request failed (${res.status}).`);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setErrorMsg('Could not reach the AirKin API server. Make sure the backend is running.');
      })
      .finally(() => {
        if (!bootController.signal.aborted) {
          setIsLoadingPlan(false);
        }
      });

    return () => {
      bootController.abort();
      planAbortRef.current?.abort();
    };
  }, []);

  const handleSelectCity = useCallback(
    (city: string) => {
      const updated = { ...profile, city };
      setProfile(updated);
      void loadCityAndPlan(updated, selectedActionIds);
    },
    [profile, selectedActionIds, loadCityAndPlan]
  );

  const handleToggleAction = useCallback((id: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSendMessage = useCallback(
    async (question: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setIsSendingChat(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
            profile,
            selectedActionIds,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          mode?: 'gemini-live';
        };

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || data.error || 'Unable to respond right now.',
          timestamp: new Date().toISOString(),
          mode: data.mode,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Network error contacting the AirKin AI service.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsSendingChat(false);
      }
    },
    [messages, profile, selectedActionIds]
  );

  const liveImpact = calculateImpactSummary(profile, aqi?.current.pm25 ?? 120, selectedActionIds);

  return {
    profile,
    setProfile,
    selectedActionIds,
    aqi,
    indiaFeed,
    plan,
    planError,
    messages,
    isLoadingPlan,
    isSendingChat,
    errorMsg,
    geminiActive,
    liveImpact,
    loadCityAndPlan,
    handleSelectCity,
    handleToggleAction,
    handleSendMessage,
  };
}

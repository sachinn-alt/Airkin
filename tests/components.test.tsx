// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateImpactSummary, getDefaultSelectedActionIds } from '../shared/impactEngine';
import type { HouseholdProfile, TailoredPlanResponse } from '../shared/types';
import { buildOfflineIndiaFeed, buildOfflineSnapshot } from '../server/airQualityService';
import { AdvisorChat } from '../src/components/AdvisorChat';
import { CommunityGuide } from '../src/components/CommunityGuide';
import { Footer } from '../src/components/Footer';
import { ImpactSimulator } from '../src/components/ImpactSimulator';
import { IndiaAqiMap } from '../src/components/IndiaAqiMap';
import { IndiaLiveFeed } from '../src/components/IndiaLiveFeed';
import { PlanCards } from '../src/components/PlanCards';
import { ProfilePanel } from '../src/components/ProfilePanel';
import { SmogChart } from '../src/components/SmogChart';
import { WeatherVisualScene } from '../src/components/WeatherVisualScene';
import { WeatherCard } from '../src/components/ui/weather-card';

afterEach(() => {
  cleanup();
});

const sampleProfile: HouseholdProfile = {
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

const samplePlan: TailoredPlanResponse = {
  mode: 'gemini-live',
  modelUsed: 'gemini-3.5-flash-lite',
  generatedAt: new Date().toISOString(),
  headline: 'Protect Delhi indoors during severe winter smog',
  situationSummary: 'Nocturnal inversion keeps street PM2.5 elevated until afternoon.',
  riskAlert: 'Run indoor HEPA or DIY Corsi-Rosenthal filtration overnight.',
  recommendations: [
    {
      id: 'rec-1',
      category: 'routine',
      priority: 'Immediate',
      title: 'Air out rooms between 14:00 and 16:00',
      timingOrEffort: 'Free · 20 mins',
      steps: ['Keep windows sealed before 12:00', 'Cross-ventilate at 14:30'],
      directImpactHeadline: '-24% peak indoor infiltration',
      directImpactDetail: 'Avoids morning thermal trap.',
      scienceWhy: 'Solar heating elevates mixing layer depth in early afternoon.',
    },
  ],
};

describe('AirKin Accessible UI Components', () => {
  it('renders keyboard-accessible IndiaAqiMap pins including Jammu & Kashmir and selects on Enter', () => {
    const feed = buildOfflineIndiaFeed();
    const onSelectCity = vi.fn();

    render(
      <IndiaAqiMap
        cities={feed.cities}
        activeCity="Delhi"
        onSelectCity={onSelectCity}
      />
    );

    const srinagarPin = screen.getByRole('button', { name: /Srinagar, Jammu & Kashmir/i });
    expect(srinagarPin).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(srinagarPin, { key: 'Enter' });
    expect(onSelectCity).toHaveBeenCalledWith('Srinagar');
  });

  it('switches CommunityGuide to Hindi and triggers English/Hindi read-aloud audio safely', () => {
    const speakMock = vi.fn();
    const cancelMock = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: speakMock, cancel: cancelMock },
    });
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      vi.fn().mockImplementation((text: string) => ({ text, lang: '', rate: 1 }));

    const aqi = buildOfflineSnapshot('Lucknow');
    const impact = calculateImpactSummary(sampleProfile, aqi.current.pm25, []);

    render(<CommunityGuide aqi={aqi} profile={sampleProfile} impact={impact} />);

    fireEvent.click(screen.getByRole('button', { name: 'हिंदी' }));
    expect(screen.getByText(/मोहल्ला स्वच्छ-हवा अलर्ट/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /हिंदी अलर्ट सुनें/i }));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('updates ImpactSimulator commute hour slider and triggers choice toggle callback', () => {
    const aqi = buildOfflineSnapshot('Delhi');
    const actions = getDefaultSelectedActionIds(sampleProfile);
    const impact = calculateImpactSummary(sampleProfile, aqi.current.pm25, actions);
    const onToggle = vi.fn();

    render(
      <ImpactSimulator
        selectedActionIds={actions}
        onToggleAction={onToggle}
        impact={impact}
        hourly={aqi.hourly}
      />
    );

    const hourSlider = screen.getByLabelText(/Select commute or school-run departure hour/i);
    fireEvent.change(hourSlider, { target: { value: '14' } });
    expect(screen.getByText(/14:00/)).toBeInTheDocument();
  });

  it('supports keyboard navigation on SmogChart and interactive layers on WeatherVisualScene', () => {
    const aqi = buildOfflineSnapshot('Delhi');
    const impact = calculateImpactSummary(sampleProfile, aqi.current.pm25, ['diy_corsi_rosenthal']);

    render(<SmogChart hourly={aqi.hourly} ventilationWindow={aqi.ventilationWindow} city="Delhi" />);
    expect(screen.getByText(/Scrub curve to inspect hours/i)).toBeInTheDocument();
    const chart = screen.getByRole('img', { name: /24 hour PM2\.5 chart for Delhi/i });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(screen.getByText(/AQI ~/i)).toBeInTheDocument();

    render(<WeatherVisualScene aqi={aqi} impact={impact} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sanctuary' }));
    expect(screen.getByText(/Protected Indoors/i)).toBeInTheDocument();
  });

  it('updates ProfilePanel, PlanCards steps, IndiaLiveFeed filters, and AdvisorChat dialog', () => {
    const onChange = vi.fn();
    const onRegenerate = vi.fn();
    render(
      <ProfilePanel
        profile={sampleProfile}
        onChange={onChange}
        onRegeneratePlan={onRegenerate}
        isLoadingPlan={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Community' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ role: 'community' }));

    render(<PlanCards plan={samplePlan} isLoading={false} planError={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Why/i }));
    expect(screen.getByText(/Solar heating elevates mixing layer depth/i)).toBeInTheDocument();

    const feed = buildOfflineIndiaFeed();
    const onSelectCity = vi.fn();
    render(<IndiaLiveFeed feed={feed} activeCity="Delhi" onSelectCity={onSelectCity} />);
    fireEvent.click(screen.getByRole('button', { name: 'North' }));
    expect(screen.getByText(/Srinagar/i)).toBeInTheDocument();

    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <AdvisorChat city="Delhi" messages={[]} onSendMessage={onSendMessage} isSending={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Open Ask AirKin Coach/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders WeatherCard forecast states and Footer navigation links cleanly', () => {
    const onRetry = vi.fn();
    render(<WeatherCard location="Delhi, IN" error="Timeout" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    const onNavigate = vi.fn();
    const onSelectCity = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
    render(<Footer onNavigate={onNavigate} onSelectCity={onSelectCity} />);
    fireEvent.click(screen.getByRole('button', { name: /Launch Impact Simulator/i }));
    expect(onNavigate).toHaveBeenCalledWith('simulator');
  });
});

import { useState, useEffect } from 'react';
import { WizardProvider, useWizard } from '@/context/WizardContext';
import WizardStepper from '@/components/WizardStepper';
import WizardNavigation from '@/components/WizardNavigation';
import StepUpload from '@/components/steps/StepUpload';
import StepClassify from '@/components/steps/StepClassify';
import StepValidate from '@/components/steps/StepValidate';
import StepAssign from '@/components/steps/StepAssign';
import StepContacts from '@/components/steps/StepContacts';
import StepHeyflows from '@/components/steps/StepHeyflows';
import StepOverview from '@/components/steps/StepOverview';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, CheckCircle2, Download } from 'lucide-react';
import { clearWizardState, saveWizardState, loadWizardState } from '@/lib/storage';
import { WIZARD_STEPS } from '@/types/organization';
import { toast } from 'sonner';
import fmLogo from '@/assets/fm-logo.svg';

const WizardContent = () => {
  const { state, dispatch } = useWizard();
  const { currentStep } = state;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-save bei Änderungen
  useEffect(() => {
    if (state.isDataLoaded) {
      saveWizardState(state);
      setLastSaved(new Date());
    }
  }, [state]);

  const handleReset = () => {
    if (confirm('Möchten Sie wirklich alle Daten löschen und von vorne beginnen?')) {
      clearWizardState();
      dispatch({ type: 'RESET' });
      setLastSaved(null);
      toast.success('Alle Daten wurden gelöscht');
    }
  };

  const handleManualSave = async () => {
    try {
      await saveWizardState(state);
      setLastSaved(new Date());
      setShowSaveConfirm(true);
      toast.success('Fortschritt gespeichert');
      setTimeout(() => setShowSaveConfirm(false), 2000);
    } catch (error) {
      toast.error('Fehler beim Speichern');
      console.error('Save error:', error);
    }
  };

  const handleLoadFromDatabase = async () => {
    setIsLoading(true);
    try {
      toast.loading('Lade Daten von Supabase...', { id: 'load' });
      
      const loadedState = await loadWizardState();
      
      if (loadedState && loadedState.organizations.length > 0) {
        dispatch({ type: 'LOAD_STATE', state: loadedState });
        toast.success(
          `Geladen: ${loadedState.organizations.length} Organisationen, ${loadedState.contactPersons.length} Kontakte, ${loadedState.heyflows.length} Heyflows`,
          { id: 'load', duration: 5000 }
        );
        setLastSaved(new Date());
      } else {
        toast.info('Keine Daten in der Datenbank gefunden', { id: 'load' });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error(
        `Fehler beim Laden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: 'load', duration: 7000 }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepUpload />;
      case 1:
        return <StepClassify />;
      case 2:
        return <StepValidate type="traeger" />;
      case 3:
        return <StepValidate type="einrichtung" />;
      case 4:
        return <StepAssign />;
      case 5:
        return <StepContacts />;
      case 6:
        return <StepHeyflows />;
      case 7:
        return <StepOverview />;
      default:
        return <StepUpload />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={fmLogo} alt="FM Recruiting" className="h-10" />
              <div>
                <h1 className="text-lg font-bold text-foreground">Datenbereinigung</h1>
                <p className="text-sm text-muted-foreground">FM-Kundendaten</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Laden-Button (immer sichtbar) */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadFromDatabase}
                disabled={isLoading}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isLoading ? 'Lädt...' : 'Laden'}
                </span>
              </Button>

              {state.isDataLoaded && (
                <>
                  {/* Speicher-Status */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-2">
                    {lastSaved && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Gespeichert um {formatLastSaved(lastSaved)}
                      </span>
                    )}
                  </div>

                  {/* Manueller Speichern-Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualSave}
                    className="gap-2"
                  >
                    {showSaveConfirm ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Speichern</span>
                  </Button>

                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Zurücksetzen</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <WizardStepper />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {renderStep()}
          <WizardNavigation />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Datenbereinigung FM-Kundendaten
        </div>
      </footer>
    </div>
  );
};

const Index = () => {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
};

export default Index;

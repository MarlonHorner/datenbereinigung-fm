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
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Heart, Save, CheckCircle2 } from 'lucide-react';
import { clearWizardState, saveWizardState, loadWizardState } from '@/lib/storage';
import { WIZARD_STEPS } from '@/types/organization';
import { toast } from 'sonner';

const WizardContent = () => {
  const { state, dispatch } = useWizard();
  const { currentStep } = state;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

  const handleManualSave = () => {
    saveWizardState(state);
    setLastSaved(new Date());
    setShowSaveConfirm(true);
    toast.success('Fortschritt gespeichert');
    setTimeout(() => setShowSaveConfirm(false), 2000);
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
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Datenbereinigung</h1>
                <p className="text-sm text-muted-foreground">Gesundheitsorganisationen</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
          Datenbereinigung für Gesundheitsorganisationen
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
